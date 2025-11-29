/**
 * GSC Module
 *
 * Google Search Console integration for Stratosphere.
 *
 * Usage:
 * ```typescript
 * import { CachedGSCClient, getDateRangeFromPreset } from '@/lib/gsc';
 *
 * const client = new CachedGSCClient(clientId);
 * const dateRange = getDateRangeFromPreset('28d');
 * const data = await client.getTimeSeriesData(siteUrl, dateRange);
 * ```
 */

// Types
export * from './types';

// Client
export {
  createGSCClient,
  CachedGSCClient,
  isMockMode,
  isGSCConnected,
  getGSCConnectionStatus,
  getClientCacheFreshness,
  getFreshnessMessage,
  getFreshnessColor,
  invalidateCache,
  getQuotaStatus,
  checkQuota,
} from './client';

// Cache
export {
  generateEndpointSignature,
  calculateCacheInfo,
  getCachedData,
  setCachedData,
  getCachedGSCData,
  getClientCacheEntries,
  cleanupExpiredCache,
} from './cache';

// Rate Limiting
export {
  RATE_LIMIT_CONFIG,
  withRateLimit,
  withStagger,
  withCircuitBreaker,
  executeWithProtection,
  trackQuotaUsage,
} from './rateLimit';

// OAuth
export {
  getGSCCredentials,
  hasGSCCredentials,
  getOAuthUrl,
  generateOAuthState,
  parseOAuthState,
  exchangeCodeForTokens,
  refreshAccessToken,
  storeClientGSCTokens,
  getClientGSCTokens,
  getValidAccessToken,
  disconnectClientGSC,
} from './oauth';

// Mock
export { MockGSCClient, generateExtendedMockData } from './mock';
