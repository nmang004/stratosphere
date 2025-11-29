/**
 * AI Module Exports
 *
 * Centralized exports for the Forensics AI system.
 */

// Types
export type {
  AMPersona,
  VerdictType,
  StrategyType,
  PageMetadata,
  AnalyzeTicketRequest,
  AnalyzeTicketResponse,
  NineMonthCheck,
  AIInteractionLog,
} from './types';

export {
  AM_PERSONA_LABELS,
  AM_PERSONA_DESCRIPTIONS,
  VERDICT_LABELS,
  VERDICT_DESCRIPTIONS,
  STRATEGY_LABELS,
} from './types';

// System Prompts
export {
  FORENSICS_SYSTEM_PROMPT,
  PERSONA_PROMPTS,
  buildForensicsPrompt,
  validateForensicsResponse,
  type ForensicsAIResponse,
} from './system-prompts';

// Constraints
export {
  checkNineMonthRule,
  detectPageType,
  isGeoQuery,
  checkMappingRule,
  getQueueTimeline,
  formatQueuedRecommendation,
  validateRecommendation,
  buildConstraintContext,
  type MappingCheckResult,
} from './constraints';

// Middleware
export {
  checkRateLimit,
  validateAnalyzeTicketRequest,
  authenticateRequest,
  getAuthenticatedUser,
  logAIInteraction,
  estimateTokens,
  measureLatency,
  ERROR_RESPONSES,
  type AuthenticatedUser,
} from './middleware';
