/**
 * Serper.dev Response Cache
 *
 * Caching layer for Serper API responses using Supabase.
 * Reduces API costs and improves response times for repeated queries.
 */

import { createClient } from '@supabase/supabase-js';
import type { SerperSearchParams, SerperSearchResponse, MarketCheckResult } from './types';
import { search, processMarketCheck } from './client';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CACHE_TTL_HOURS = 24;

// =============================================================================
// CACHED SEARCH
// =============================================================================

/**
 * Search with caching support.
 * First checks cache, then falls back to API if cache miss or expired.
 */
export async function searchWithCache(
  params: SerperSearchParams,
  ttlHours: number = DEFAULT_CACHE_TTL_HOURS
): Promise<{ response: SerperSearchResponse; cached: boolean }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Generate cache key components
  const cacheKey = {
    query: params.q.toLowerCase().trim(),
    location: params.location?.toLowerCase().trim() || null,
    gl: params.gl || 'us',
  };

  // Try to get from cache
  const { data: cached } = await supabase.rpc('get_serper_cache', {
    p_query: cacheKey.query,
    p_location: cacheKey.location,
    p_gl: cacheKey.gl,
  });

  if (cached) {
    return {
      response: cached as SerperSearchResponse,
      cached: true,
    };
  }

  // Cache miss - fetch from API
  const response = await search(params);

  // Store in cache (fire and forget)
  supabase.rpc('set_serper_cache', {
    p_query: cacheKey.query,
    p_response: response,
    p_location: cacheKey.location,
    p_gl: cacheKey.gl,
    p_ttl_hours: ttlHours,
  }).then(({ error }) => {
    if (error) {
      console.error('Failed to cache Serper response:', error);
    }
  });

  return {
    response,
    cached: false,
  };
}

/**
 * Perform a market check with caching.
 * Combines search + market analysis in one call.
 */
export async function marketCheckWithCache(
  query: string,
  targetDomain: string,
  options: {
    location?: string;
    gl?: string;
    ttlHours?: number;
  } = {}
): Promise<MarketCheckResult> {
  const { response, cached } = await searchWithCache(
    {
      q: query,
      location: options.location,
      gl: options.gl,
      num: 20, // Get more results for better competitor analysis
    },
    options.ttlHours
  );

  const result = processMarketCheck(response, targetDomain);
  result.cached = cached;

  return result;
}

/**
 * Batch market check for multiple queries.
 * Useful for checking ranking across multiple keywords.
 */
export async function batchMarketCheck(
  queries: string[],
  targetDomain: string,
  options: {
    location?: string;
    gl?: string;
    ttlHours?: number;
    concurrency?: number;
  } = {}
): Promise<MarketCheckResult[]> {
  const concurrency = options.concurrency || 3;
  const results: MarketCheckResult[] = [];

  // Process in batches to avoid rate limiting
  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((query) =>
        marketCheckWithCache(query, targetDomain, options)
      )
    );
    results.push(...batchResults);

    // Small delay between batches to be nice to the API
    if (i + concurrency < queries.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Clean up expired cache entries.
 * Should be called periodically via Inngest job.
 */
export async function cleanupExpiredCache(): Promise<number> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.rpc('cleanup_serper_cache');

  if (error) {
    console.error('Failed to cleanup Serper cache:', error);
    return 0;
  }

  return data as number;
}
