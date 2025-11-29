/**
 * Serper.dev Module Exports
 *
 * Centralized exports for the Serper.dev API integration.
 */

// Types
export type {
  SerperSearchParams,
  SerperSearchResponse,
  SerperOrganicResult,
  SerperPeopleAlsoAsk,
  SerperRelatedSearch,
  SerperKnowledgeGraph,
  SerperLocalResult,
  MarketCheckResult,
  CachedSerperResponse,
} from './types';

// Client functions
export {
  search,
  processMarketCheck,
  isSerperConfigured,
} from './client';

// Cache functions
export {
  searchWithCache,
  marketCheckWithCache,
  batchMarketCheck,
  cleanupExpiredCache,
} from './cache';
