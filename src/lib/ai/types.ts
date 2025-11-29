/**
 * AI Module Types
 *
 * Type definitions for the Forensics AI system.
 */

// =============================================================================
// AM PERSONA TYPES
// =============================================================================

export type AMPersona = 'PANIC_PATTY' | 'TECHNICAL_TOM' | 'GHOST_GARY';

export const AM_PERSONA_LABELS: Record<AMPersona, string> = {
  PANIC_PATTY: 'Panic Patty',
  TECHNICAL_TOM: 'Technical Tom',
  GHOST_GARY: 'Ghost Gary',
};

export const AM_PERSONA_DESCRIPTIONS: Record<AMPersona, string> = {
  PANIC_PATTY: 'Needs reassurance and data-heavy explanations',
  TECHNICAL_TOM: 'Wants technical details and root cause analysis',
  GHOST_GARY: 'Needs brief, action-focused responses',
};

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

export const VERDICT_LABELS: Record<VerdictType, string> = {
  FALSE_ALARM: 'False Alarm',
  TECHNICAL_FAILURE: 'Technical Failure',
  COMPETITOR_WIN: 'Competitor Win',
  ALGO_IMPACT: 'Algorithm Impact',
  CANNIBALIZATION: 'Cannibalization',
  NEEDS_INVESTIGATION: 'Needs Investigation',
};

export const VERDICT_DESCRIPTIONS: Record<VerdictType, string> = {
  FALSE_ALARM: 'The concern is not valid or is expected behavior',
  TECHNICAL_FAILURE: 'Website or technical issues causing the problem',
  COMPETITOR_WIN: 'Competitors have improved and are outranking',
  ALGO_IMPACT: 'Google algorithm update is affecting rankings',
  CANNIBALIZATION: 'Multiple pages competing for the same keywords',
  NEEDS_INVESTIGATION: 'More data or manual review is required',
};

// =============================================================================
// STRATEGY TYPES
// =============================================================================

export type StrategyType =
  | 'MINI_HOMEPAGE'
  | 'AREAS_WE_SERVE'
  | 'CONTENT_REFRESH'
  | 'DIGITAL_PR'
  | 'WEB_HEALTH_FIX'
  | 'UNMAP_AND_CREATE';

export const STRATEGY_LABELS: Record<StrategyType, string> = {
  MINI_HOMEPAGE: 'Mini-Homepage',
  AREAS_WE_SERVE: 'Areas We Serve Build',
  CONTENT_REFRESH: 'Content Refresh',
  DIGITAL_PR: 'Digital PR',
  WEB_HEALTH_FIX: 'Web Health Fix',
  UNMAP_AND_CREATE: 'Unmap and Create',
};

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface PageMetadata {
  url: string;
  pageType?: 'GENERIC' | 'GEO' | 'SERVICE' | 'HOMEPAGE';
  lastOptimizationDate?: string;
  createdDate?: string;
  title?: string;
}

export interface AnalyzeTicketRequest {
  ticketBody: string;
  targetDomain: string;
  amPersona: AMPersona;
  pageMetadata?: PageMetadata;
  targetQuery?: string;
  location?: string;
}

export interface NineMonthCheck {
  isLocked: boolean;
  reason: string;
}

export interface AnalyzeTicketResponse {
  verdict: VerdictType;
  rootCause: string;
  strategy: string | null;
  evidence: string[];
  confidence: number;
  nineMonthCheck?: NineMonthCheck;
  draftEmail: string;
  forensicData: {
    marketCheck?: import('../serper/types').MarketCheckResult;
    algoOverlay?: import('../forensics/types').AlgoOverlayResult;
    nukeCheck?: import('../forensics/types').NukeCheckResult;
    cannibalization?: import('../forensics/types').CannibalizationResult;
  };
  warnings: string[];
  modelUsed: string;
  latencyMs: number;
}

// =============================================================================
// LOGGING TYPES
// =============================================================================

export interface AIInteractionLog {
  userId: string;
  ticketBody: string;
  targetDomain: string;
  amPersona: AMPersona;
  verdict: VerdictType;
  strategy: string | null;
  confidence: number;
  violations: string[];
  latencyMs: number;
  modelUsed: string;
  createdAt: string;
}
