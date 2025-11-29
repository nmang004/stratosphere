/**
 * Algorithm Overlay Module
 *
 * Correlates traffic changes with Google algorithm updates.
 * Helps identify if ranking drops are due to algorithm changes.
 */

import type {
  AlgoUpdate,
  TimeSeriesPoint,
  OverlaidDataPoint,
  AlgoOverlayResult,
} from './types';
import { GOOGLE_UPDATES, ALGO_CORRELATION_THRESHOLDS } from './constants';

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get all algorithm updates within a date range.
 */
export function getUpdatesInRange(startDate: Date, endDate: Date): AlgoUpdate[] {
  return GOOGLE_UPDATES.filter((update) => {
    const updateDate = new Date(update.date);
    return updateDate >= startDate && updateDate <= endDate;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Overlay algorithm updates onto time series data.
 * Adds update markers to data points that fall within update periods.
 */
export function overlayUpdatesOnTimeSeries(
  data: TimeSeriesPoint[],
  updates?: AlgoUpdate[]
): OverlaidDataPoint[] {
  const relevantUpdates = updates || getRelevantUpdates(data);

  return data.map((point) => {
    const pointDate = new Date(point.date);
    const overlappingUpdates = relevantUpdates.filter((update) => {
      const updateStart = new Date(update.date);
      const updateEnd = new Date(updateStart);
      updateEnd.setDate(updateEnd.getDate() + (update.rolloutDays || 14));

      return pointDate >= updateStart && pointDate <= updateEnd;
    });

    return {
      ...point,
      updates: overlappingUpdates,
    };
  });
}

/**
 * Analyze correlations between traffic changes and algorithm updates.
 */
export function analyzeAlgoCorrelations(
  data: TimeSeriesPoint[],
  updates?: AlgoUpdate[]
): AlgoOverlayResult {
  const relevantUpdates = updates || getRelevantUpdates(data);
  const overlaidData = overlayUpdatesOnTimeSeries(data, relevantUpdates);
  const correlations: AlgoOverlayResult['correlations'] = [];

  for (const update of relevantUpdates) {
    const correlation = calculateUpdateCorrelation(data, update);
    if (correlation) {
      correlations.push(correlation);
    }
  }

  // Sort by impact magnitude
  correlations.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  return {
    data: overlaidData,
    updatesInRange: relevantUpdates,
    correlations,
  };
}

/**
 * Check if a specific date falls within an algorithm update rollout period.
 */
export function isDateDuringUpdate(date: Date): AlgoUpdate | null {
  for (const update of GOOGLE_UPDATES) {
    const updateStart = new Date(update.date);
    const updateEnd = new Date(updateStart);
    updateEnd.setDate(updateEnd.getDate() + (update.rolloutDays || 14));

    if (date >= updateStart && date <= updateEnd) {
      return update;
    }
  }
  return null;
}

/**
 * Get the most recent algorithm update before a given date.
 */
export function getMostRecentUpdate(date: Date): AlgoUpdate | null {
  const sorted = [...GOOGLE_UPDATES].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const update of sorted) {
    if (new Date(update.date) <= date) {
      return update;
    }
  }
  return null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get updates relevant to a time series dataset.
 */
function getRelevantUpdates(data: TimeSeriesPoint[]): AlgoUpdate[] {
  if (data.length === 0) return [];

  const dates = data.map((d) => new Date(d.date));
  const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Extend range to catch updates that might have impacted the period
  startDate.setDate(startDate.getDate() - 30);
  endDate.setDate(endDate.getDate() + 7);

  return getUpdatesInRange(startDate, endDate);
}

/**
 * Calculate correlation between traffic and a specific update.
 */
function calculateUpdateCorrelation(
  data: TimeSeriesPoint[],
  update: AlgoUpdate
): AlgoOverlayResult['correlations'][0] | null {
  const updateDate = new Date(update.date);
  const { BASELINE_DAYS, IMPACT_DAYS, MIN_CHANGE_PERCENT } = ALGO_CORRELATION_THRESHOLDS;

  // Get baseline (average before update)
  const baselineStart = new Date(updateDate);
  baselineStart.setDate(baselineStart.getDate() - BASELINE_DAYS);
  const baselineData = data.filter((d) => {
    const date = new Date(d.date);
    return date >= baselineStart && date < updateDate;
  });

  // Get impact period (after update)
  const impactEnd = new Date(updateDate);
  impactEnd.setDate(impactEnd.getDate() + IMPACT_DAYS);
  const impactData = data.filter((d) => {
    const date = new Date(d.date);
    return date >= updateDate && date <= impactEnd;
  });

  if (baselineData.length === 0 || impactData.length === 0) {
    return null;
  }

  const baselineAvg = average(baselineData.map((d) => d.value));
  const impactAvg = average(impactData.map((d) => d.value));

  if (baselineAvg === 0) return null;

  const changePercent = ((impactAvg - baselineAvg) / baselineAvg) * 100;

  // Only report significant changes
  if (Math.abs(changePercent) < MIN_CHANGE_PERCENT) {
    return null;
  }

  // Find the day with the biggest change
  let maxChangeDay = 0;
  let maxChange = 0;
  for (let i = 0; i < impactData.length; i++) {
    const change = Math.abs(impactData[i].value - baselineAvg);
    if (change > maxChange) {
      maxChange = change;
      maxChangeDay = i;
    }
  }

  return {
    update,
    changePercent: Math.round(changePercent * 10) / 10,
    direction: changePercent > 5 ? 'UP' : changePercent < -5 ? 'DOWN' : 'STABLE',
    daysToImpact: maxChangeDay,
  };
}

/**
 * Calculate average of an array of numbers.
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format update for display.
 */
export function formatUpdateForDisplay(update: AlgoUpdate): string {
  const impact = {
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🟢',
  }[update.impactLevel];

  return `${impact} ${update.name} (${update.date})`;
}

/**
 * Get human-readable summary of algo impact.
 */
export function summarizeAlgoImpact(result: AlgoOverlayResult): string {
  if (result.correlations.length === 0) {
    return 'No significant algorithm correlations detected.';
  }

  const topCorrelation = result.correlations[0];
  const direction = topCorrelation.direction === 'DOWN' ? 'decline' : 'increase';

  return `Traffic ${direction} of ${Math.abs(topCorrelation.changePercent)}% ` +
    `correlates with ${topCorrelation.update.name} ` +
    `(impact visible ${topCorrelation.daysToImpact} days after rollout start).`;
}
