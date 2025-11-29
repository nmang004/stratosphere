/**
 * Forensics Engine Types
 *
 * Type definitions for all forensic analysis results.
 */

// =============================================================================
// DATE RANGE TYPES
// =============================================================================

export interface DateRange {
  start: Date;
  end: Date;
}

// =============================================================================
// NUKE DETECTOR TYPES
// =============================================================================

export interface NukedPage {
  url: string;
  previousClicks: number;
  previousImpressions: number;
  currentImpressions: number;
  dropDate?: string;
}

export interface NukeCheckResult {
  nukedPages: NukedPage[];
  summary: {
    totalNuked: number;
    percentageAffected: number;
    severity: 'CRITICAL' | 'WARNING' | 'NONE';
  };
  periodA: DateRange;
  periodB: DateRange;
  timestamp: string;
}

// =============================================================================
// ALGO OVERLAY TYPES
// =============================================================================

export type AlgoUpdateType = 'CORE' | 'SPAM' | 'HELPFUL_CONTENT' | 'LINK' | 'REVIEWS' | 'LOCAL' | 'OTHER';

export interface AlgoUpdate {
  date: string;
  name: string;
  type: AlgoUpdateType;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  description?: string;
  rolloutDays?: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  metric?: string;
}

export interface OverlaidDataPoint extends TimeSeriesPoint {
  updates: AlgoUpdate[];
}

export interface AlgoOverlayResult {
  data: OverlaidDataPoint[];
  updatesInRange: AlgoUpdate[];
  correlations: Array<{
    update: AlgoUpdate;
    changePercent: number;
    direction: 'UP' | 'DOWN' | 'STABLE';
    daysToImpact: number;
  }>;
}

// =============================================================================
// CANNIBALIZATION TYPES
// =============================================================================

export interface RankingChange {
  date: string;
  url: string;
  position: number;
}

export interface CannibalizedQuery {
  query: string;
  urlChanges: RankingChange[];
  changeCount: number;
  currentUrl: string;
  suggestedAction: string;
}

export interface CannibalizationResult {
  cannibalizedQueries: CannibalizedQuery[];
  summary: {
    totalAffectedQueries: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    primaryIssue: string | null;
  };
  timestamp: string;
}

// =============================================================================
// VERDICT TYPES
// =============================================================================

export type VerdictType =
  | 'FALSE_ALARM'
  | 'TECHNICAL_FAILURE'
  | 'COMPETITOR_WIN'
  | 'ALGO_IMPACT'
  | 'CANNIBALIZATION'
  | 'NEEDS_INVESTIGATION';

export interface ForensicsVerdict {
  verdict: VerdictType;
  confidence: number;
  evidence: string[];
  primaryCause: string;
}

// =============================================================================
// COMBINED FORENSICS RESULT
// =============================================================================

export interface ForensicsData {
  nukeCheck?: NukeCheckResult;
  algoOverlay?: AlgoOverlayResult;
  cannibalization?: CannibalizationResult;
  marketCheck?: import('../serper/types').MarketCheckResult;
}

export interface FullForensicsResult {
  domain: string;
  forensicData: ForensicsData;
  verdict: ForensicsVerdict;
  timestamp: string;
  executionTimeMs: number;
}
