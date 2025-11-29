/**
 * GSC Cache Layer
 *
 * Implements cache-first strategy for GSC data fetching.
 * From SRS FR-C1:
 * - Check gsc_cache_logs for valid data (< 24h old via expires_at)
 * - If valid, use cached data
 * - If not, trigger API call
 * - Display data freshness timestamp in all outputs
 *
 * Cache Freshness Warnings:
 * - > 12h: "[Data is {age}h old. Consider refreshing for critical decisions.]"
 * - > 20h: "[Warning: Data approaching expiration. Refresh recommended.]"
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { CacheOptions, CacheInfo, CachedGSCResponse } from './types';
import { Database, Json } from '@/types/database';
import crypto from 'crypto';

type GscCacheLog = Database['public']['Tables']['gsc_cache_logs']['Row'];
type GscCacheLogInsert = Database['public']['Tables']['gsc_cache_logs']['Insert'];

// Use admin client for cache write operations (bypasses RLS)
async function getAdminClient() {
  return createAdminClient();
}

// Default cache duration: 24 hours
const DEFAULT_CACHE_HOURS = 24;
const STALE_THRESHOLD_HOURS = 12;
const EXPIRING_THRESHOLD_HOURS = 20;

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Generate a unique endpoint signature for caching
 */
export function generateEndpointSignature(
  endpoint: string,
  params: Record<string, unknown>
): string {
  const normalized = JSON.stringify({
    endpoint,
    params: sortObject(params),
  });

  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

/**
 * Sort object keys for consistent hashing
 */
function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      const value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sorted[key] = sortObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        sorted[key] = value.map((item) =>
          typeof item === 'object' ? sortObject(item as Record<string, unknown>) : item
        );
      } else {
        sorted[key] = value;
      }
    });
  return sorted;
}

// =============================================================================
// CACHE INFO CALCULATION
// =============================================================================

/**
 * Calculate cache info from cache entry
 */
export function calculateCacheInfo(
  cachedAt: Date | null,
  expiresAt: Date | null
): CacheInfo {
  if (!cachedAt) {
    return {
      fromCache: false,
      cachedAt: null,
      expiresAt: null,
      ageHours: 0,
      isStale: true,
      isExpiring: true,
    };
  }

  const now = new Date();
  const ageMs = now.getTime() - cachedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  return {
    fromCache: true,
    cachedAt,
    expiresAt,
    ageHours: Math.round(ageHours * 10) / 10, // Round to 1 decimal
    isStale: ageHours > STALE_THRESHOLD_HOURS,
    isExpiring: ageHours > EXPIRING_THRESHOLD_HOURS,
  };
}

/**
 * Get human-readable freshness message
 */
export function getFreshnessMessage(cacheInfo: CacheInfo): string | null {
  if (!cacheInfo.fromCache) {
    return null;
  }

  if (cacheInfo.isExpiring) {
    return `Warning: Data approaching expiration (${cacheInfo.ageHours.toFixed(1)}h old). Refresh recommended.`;
  }

  if (cacheInfo.isStale) {
    return `Data is ${cacheInfo.ageHours.toFixed(1)}h old. Consider refreshing for critical decisions.`;
  }

  return null;
}

/**
 * Get freshness color for UI
 */
export function getFreshnessColor(cacheInfo: CacheInfo): 'green' | 'yellow' | 'red' {
  if (!cacheInfo.fromCache || cacheInfo.ageHours > EXPIRING_THRESHOLD_HOURS) {
    return 'red';
  }

  if (cacheInfo.ageHours > STALE_THRESHOLD_HOURS) {
    return 'yellow';
  }

  return 'green';
}

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

/**
 * Get cached GSC data if valid
 */
export async function getCachedData<T>(
  clientId: string,
  endpointSignature: string
): Promise<CachedGSCResponse<T> | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('gsc_cache_logs')
    .select('data_payload, created_at, expires_at')
    .eq('client_id', clientId)
    .eq('endpoint_signature', endpointSignature)
    .gt('expires_at', new Date().toISOString())
    .single() as { data: GscCacheLog | null; error: unknown };

  if (error || !data) {
    return null;
  }

  const cachedAt = new Date(data.created_at);
  const expiresAt = new Date(data.expires_at);
  const cacheInfo = calculateCacheInfo(cachedAt, expiresAt);

  return {
    data: data.data_payload as T,
    cacheInfo,
  };
}

/**
 * Store data in cache
 * Uses admin client to bypass RLS for server-side caching
 */
export async function setCachedData<T>(
  clientId: string,
  endpointSignature: string,
  data: T,
  maxAgeHours: number = DEFAULT_CACHE_HOURS
): Promise<CacheInfo> {
  const supabase = await getAdminClient();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + maxAgeHours * 60 * 60 * 1000);

  // Count rows in data if it's an array or has a rows property
  let rowCount: number | null = null;
  if (Array.isArray(data)) {
    rowCount = data.length;
  } else if (data && typeof data === 'object' && 'rows' in data) {
    rowCount = (data as { rows: unknown[] }).rows?.length || null;
  }

  // Upsert cache entry (replace if exists)
  const cacheEntry: GscCacheLogInsert = {
    client_id: clientId,
    endpoint_signature: endpointSignature,
    data_payload: data as Json,
    row_count: rowCount,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const { error } = await supabase
    .from('gsc_cache_logs')
    .upsert(cacheEntry as never, {
      onConflict: 'client_id,endpoint_signature',
    });

  if (error) {
    console.error('Error caching GSC data:', error);
    throw error;
  }

  return calculateCacheInfo(now, expiresAt);
}

/**
 * Invalidate cache for a client
 * Uses admin client to bypass RLS for server-side cache management
 */
export async function invalidateCache(
  clientId: string,
  endpointSignature?: string
): Promise<void> {
  const supabase = await getAdminClient();

  const query = supabase
    .from('gsc_cache_logs')
    .delete()
    .eq('client_id', clientId);

  if (endpointSignature) {
    query.eq('endpoint_signature', endpointSignature);
  }

  const { error } = await query;

  if (error) {
    console.error('Error invalidating cache:', error);
    throw error;
  }
}

// =============================================================================
// CACHE-FIRST DATA FETCHING
// =============================================================================

/**
 * Get GSC data with cache-first strategy
 *
 * @param endpoint - API endpoint identifier
 * @param params - Query parameters
 * @param fetchFn - Function to fetch fresh data
 * @param options - Cache options
 */
export async function getCachedGSCData<T>(
  endpoint: string,
  params: Record<string, unknown>,
  fetchFn: () => Promise<T>,
  options: CacheOptions
): Promise<CachedGSCResponse<T>> {
  const { clientId, forceRefresh = false, maxAge = DEFAULT_CACHE_HOURS } = options;
  const endpointSignature = generateEndpointSignature(endpoint, params);

  // Skip cache if force refresh
  if (!forceRefresh) {
    const cached = await getCachedData<T>(clientId, endpointSignature);
    if (cached) {
      return cached;
    }
  }

  // Fetch fresh data
  const freshData = await fetchFn();

  // Store in cache
  const cacheInfo = await setCachedData(clientId, endpointSignature, freshData, maxAge);

  return {
    data: freshData,
    cacheInfo: {
      ...cacheInfo,
      fromCache: false, // Just fetched
    },
  };
}

// =============================================================================
// CACHE FRESHNESS QUERIES
// =============================================================================

/**
 * Get cache freshness status for a client (for display)
 */
export async function getClientCacheFreshness(clientId: string): Promise<{
  hasCache: boolean;
  lastSync: Date | null;
  hoursOld: number;
  isStale: boolean;
  isExpiring: boolean;
  recommendation: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('gsc_cache_logs')
    .select('created_at')
    .eq('client_id', clientId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: Pick<GscCacheLog, 'created_at'> | null; error: unknown };

  if (error || !data) {
    return {
      hasCache: false,
      lastSync: null,
      hoursOld: Infinity,
      isStale: true,
      isExpiring: true,
      recommendation: 'No cached data. Sync required.',
    };
  }

  const lastSync = new Date(data.created_at);
  const hoursOld = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
  const isStale = hoursOld > STALE_THRESHOLD_HOURS;
  const isExpiring = hoursOld > EXPIRING_THRESHOLD_HOURS;

  let recommendation: string;
  if (isExpiring) {
    recommendation = 'Data approaching expiration. Refresh recommended.';
  } else if (isStale) {
    recommendation = 'Data is stale. Consider refreshing for critical decisions.';
  } else {
    recommendation = 'Data is fresh.';
  }

  return {
    hasCache: true,
    lastSync,
    hoursOld: Math.round(hoursOld * 10) / 10,
    isStale,
    isExpiring,
    recommendation,
  };
}

/**
 * Get all cache entries for a client
 */
export async function getClientCacheEntries(clientId: string): Promise<
  Array<{
    endpointSignature: string;
    createdAt: Date;
    expiresAt: Date;
    rowCount: number | null;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('gsc_cache_logs')
    .select('endpoint_signature, created_at, expires_at, row_count')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false }) as {
      data: Pick<GscCacheLog, 'endpoint_signature' | 'created_at' | 'expires_at' | 'row_count'>[] | null;
      error: unknown;
    };

  if (error || !data) {
    return [];
  }

  return data.map((entry) => ({
    endpointSignature: entry.endpoint_signature,
    createdAt: new Date(entry.created_at),
    expiresAt: new Date(entry.expires_at),
    rowCount: entry.row_count,
  }));
}

// =============================================================================
// CACHE CLEANUP
// =============================================================================

/**
 * Clean up expired cache entries (run periodically)
 * Uses admin client to bypass RLS for server-side cache management
 */
export async function cleanupExpiredCache(): Promise<number> {
  const supabase = await getAdminClient();

  const { data, error } = await supabase
    .from('gsc_cache_logs')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning up cache:', error);
    throw error;
  }

  return data?.length || 0;
}
