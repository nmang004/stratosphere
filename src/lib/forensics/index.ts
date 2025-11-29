/**
 * Forensics Engine Module Exports
 *
 * Centralized exports for the SEO Forensics Engine.
 */

// Types
export type {
  DateRange,
  NukedPage,
  NukeCheckResult,
  AlgoUpdate,
  AlgoUpdateType,
  TimeSeriesPoint,
  OverlaidDataPoint,
  AlgoOverlayResult,
  RankingChange,
  CannibalizedQuery,
  CannibalizationResult,
  VerdictType,
  ForensicsVerdict,
  ForensicsData,
  FullForensicsResult,
} from './types';

// Constants
export {
  GOOGLE_UPDATES,
  NUKE_THRESHOLDS,
  CANNIBALIZATION_THRESHOLDS,
  ALGO_CORRELATION_THRESHOLDS,
  HANDBOOK_RULES,
  ALLOWED_STRATEGIES,
  type StrategyId,
} from './constants';

// Algo Overlay Functions
export {
  getUpdatesInRange,
  overlayUpdatesOnTimeSeries,
  analyzeAlgoCorrelations,
  isDateDuringUpdate,
  getMostRecentUpdate,
  formatUpdateForDisplay,
  summarizeAlgoImpact,
} from './algo-overlay';

// Nuke Detector Functions
export {
  detectNukedPages,
  checkUrlRanking,
  summarizeNukeCheck,
} from './nuke-detector';

// Cannibalization Functions
export {
  detectCannibalization,
  checkQueryCannibalization,
  summarizeCannibalization,
} from './cannibalization';

// Market Check Functions
export {
  verifyRanking,
  bulkVerifyRankings,
  compareWithCompetitors,
  summarizeMarketCheck,
  summarizeBulkVerification,
  type MarketVerificationResult,
  type BulkVerificationResult,
} from './market-check';
