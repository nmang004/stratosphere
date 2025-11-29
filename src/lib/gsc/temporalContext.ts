/**
 * Temporal Context Engine
 *
 * Implements FR-C3: Temporal Context Engine
 *
 * When analyzing traffic anomalies:
 * 1. Query calendar_events table for overlapping dates and matching geo_scope
 * 2. If match found, label anomaly as "Seasonal/Event-Driven"
 * 3. Required AI phrase: "This coincides with {event_name}. Recommend comparing YoY rather than WoW."
 */

import { createClient } from '@/lib/supabase/server';
import { CalendarEvent } from '@/types/database';
import { GSCAnomalyContext, CalendarEventContext } from './types';

// Anomaly detection thresholds
const ANOMALY_THRESHOLD_PERCENT = 20; // > 20% change from expected
const DATE_RANGE_DAYS = 3; // ±3 days for event matching

/**
 * Get temporal context for an anomaly date
 *
 * @param clientId - The client ID (for client-specific events)
 * @param anomalyDate - The date of the anomaly
 * @param geoScope - Optional geo scope filter (e.g., ['US', 'UK'])
 */
export async function getTemporalContext(
  clientId: string,
  anomalyDate: Date,
  geoScope?: string[]
): Promise<CalendarEventContext[]> {
  const supabase = await createClient();

  // Calculate date range (±3 days)
  const startDate = new Date(anomalyDate);
  startDate.setDate(startDate.getDate() - DATE_RANGE_DAYS);

  const endDate = new Date(anomalyDate);
  endDate.setDate(endDate.getDate() + DATE_RANGE_DAYS);

  // Query calendar events
  let query = supabase
    .from('calendar_events')
    .select('*')
    .gte('event_date', startDate.toISOString().split('T')[0])
    .lte('event_date', endDate.toISOString().split('T')[0]);

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching calendar events:', error);
    return [];
  }

  // Filter by geo_scope if provided
  let events = data as CalendarEvent[];

  if (geoScope && geoScope.length > 0) {
    events = events.filter((event) => {
      // GLOBAL matches everything
      if (event.geo_scope.includes('GLOBAL')) return true;
      // Check for overlap with provided geo_scope
      return event.geo_scope.some((geo) => geoScope.includes(geo));
    });
  }

  // Transform to context format
  return events.map((event) => ({
    eventId: event.id,
    eventName: event.event_name,
    eventType: event.event_type,
    eventDate: event.event_date,
    geoScope: event.geo_scope,
    notes: event.notes || undefined,
  }));
}

/**
 * Detect anomalies in time series data
 *
 * @param data - Array of {date, value} pairs
 * @param metric - The metric name for context
 */
export function detectAnomalies(
  data: Array<{ date: string; value: number }>,
  metric: 'clicks' | 'impressions' | 'ctr' | 'position'
): Array<{
  date: Date;
  actualValue: number;
  expectedValue: number;
  deviationPercent: number;
}> {
  if (data.length < 7) {
    return []; // Need at least 7 days for meaningful analysis
  }

  const anomalies: Array<{
    date: Date;
    actualValue: number;
    expectedValue: number;
    deviationPercent: number;
  }> = [];

  // Calculate rolling average (7-day window)
  for (let i = 7; i < data.length; i++) {
    const windowStart = i - 7;
    const window = data.slice(windowStart, i);
    const expectedValue = window.reduce((sum, d) => sum + d.value, 0) / window.length;

    const currentValue = data[i].value;
    const deviation = ((currentValue - expectedValue) / expectedValue) * 100;

    if (Math.abs(deviation) > ANOMALY_THRESHOLD_PERCENT) {
      anomalies.push({
        date: new Date(data[i].date),
        actualValue: currentValue,
        expectedValue,
        deviationPercent: deviation,
      });
    }
  }

  return anomalies;
}

/**
 * Analyze anomalies with temporal context
 *
 * @param clientId - The client ID
 * @param data - Time series data
 * @param metric - The metric being analyzed
 * @param geoScope - Optional geo scope filter
 */
export async function analyzeAnomaliesWithContext(
  clientId: string,
  data: Array<{ date: string; value: number }>,
  metric: 'clicks' | 'impressions' | 'ctr' | 'position',
  geoScope?: string[]
): Promise<GSCAnomalyContext[]> {
  // Detect anomalies
  const anomalies = detectAnomalies(data, metric);

  // Get temporal context for each anomaly
  const contextualizedAnomalies = await Promise.all(
    anomalies.map(async (anomaly) => {
      const calendarEvents = await getTemporalContext(clientId, anomaly.date, geoScope);

      return {
        date: anomaly.date,
        metric,
        actualValue: anomaly.actualValue,
        expectedValue: anomaly.expectedValue,
        deviationPercent: anomaly.deviationPercent,
        calendarEvents,
        isSeasonalOrEventDriven: calendarEvents.length > 0,
      };
    })
  );

  return contextualizedAnomalies;
}

/**
 * Generate AI-compatible anomaly description
 *
 * Per SRS FR-C3: Required AI phrase when seasonal event found
 */
export function generateAnomalyDescription(context: GSCAnomalyContext): string {
  const direction = context.deviationPercent > 0 ? 'increased' : 'decreased';
  const dateStr = context.date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  let description = `On ${dateStr}, ${context.metric} ${direction} by ${Math.abs(
    context.deviationPercent
  ).toFixed(1)}% compared to the 7-day average.`;

  if (context.isSeasonalOrEventDriven && context.calendarEvents.length > 0) {
    const events = context.calendarEvents.map((e) => e.eventName).join(', ');

    // Required phrase per SRS
    description += ` This coincides with ${events}. Recommend comparing YoY rather than WoW.`;
  } else {
    description += ' No known events overlap with this date range. Anomaly classified as "Unexplained" pending investigation.';
  }

  return description;
}

/**
 * Check if a specific date has relevant calendar events
 */
export async function hasCalendarEventsNearDate(
  date: Date,
  geoScope?: string[]
): Promise<boolean> {
  const supabase = await createClient();

  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - DATE_RANGE_DAYS);

  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + DATE_RANGE_DAYS);

  const { count, error } = await supabase
    .from('calendar_events')
    .select('*', { count: 'exact', head: true })
    .gte('event_date', startDate.toISOString().split('T')[0])
    .lte('event_date', endDate.toISOString().split('T')[0]);

  if (error) {
    console.error('Error checking calendar events:', error);
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Get algorithm updates near a date (for AI context)
 */
export async function getAlgorithmUpdatesNearDate(
  date: Date
): Promise<CalendarEventContext[]> {
  const supabase = await createClient();

  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 14); // Check 2 weeks before

  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 7); // Check 1 week after

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('event_type', 'ALGORITHM_UPDATE')
    .gte('event_date', startDate.toISOString().split('T')[0])
    .lte('event_date', endDate.toISOString().split('T')[0]);

  if (error || !data) {
    return [];
  }

  return data.map((event: CalendarEvent) => ({
    eventId: event.id,
    eventName: event.event_name,
    eventType: event.event_type,
    eventDate: event.event_date,
    geoScope: event.geo_scope,
    notes: event.notes || undefined,
  }));
}
