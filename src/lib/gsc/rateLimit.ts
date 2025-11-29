/**
 * GSC Rate Limiter
 *
 * Implements circuit breaker pattern with exponential backoff
 * for Google Search Console API rate limiting.
 *
 * From SRS 2.1.1:
 * - Retries: 5
 * - Backoff: exponential (min 60s, max 1h)
 * - Quota threshold: sleep if < 10 remaining
 * - Stagger: 2s between client fetches
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { RateLimitConfig, QuotaStatus } from './types';
import { Database } from '@/types/database';

type ApiQuotaTracking = Database['public']['Tables']['api_quota_tracking']['Row'];
type ApiQuotaTrackingInsert = Database['public']['Tables']['api_quota_tracking']['Insert'];

// Use admin client for quota operations (bypasses RLS)
async function getAdminClient() {
  return createAdminClient();
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export const RATE_LIMIT_CONFIG: RateLimitConfig = {
  retries: 5,
  backoff: {
    type: 'exponential',
    minDelay: 60000,    // 1 minute
    maxDelay: 3600000,  // 1 hour
  },
  quotaThreshold: 10,   // Sleep if quota < 10
  sleepDuration: 300000, // 5 minutes
  staggerDelay: 2000,   // 2s between client fetches
};

// Default daily quota (GSC API default)
const DEFAULT_DAILY_QUOTA = 25000;

// =============================================================================
// QUOTA TRACKING
// =============================================================================

/**
 * Check current quota status for a client
 * Uses admin client to bypass RLS for server-side quota tracking
 */
export async function checkQuota(clientId: string): Promise<QuotaStatus> {
  const supabase = await getAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('api_quota_tracking')
    .select('*')
    .eq('client_id', clientId)
    .eq('api_type', 'GSC')
    .eq('quota_date', today)
    .single() as { data: ApiQuotaTracking | null; error: { code: string } | null };

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking quota:', error);
  }

  const used = data?.used_quota || 0;
  const allocated = data?.allocated_quota || DEFAULT_DAILY_QUOTA;
  const reserved = data?.reserved_quota || 0;
  const remaining = allocated - used - reserved;

  // Calculate next reset time (midnight UTC)
  const now = new Date();
  const nextReset = new Date(now);
  nextReset.setUTCHours(24, 0, 0, 0);

  return {
    remaining,
    used,
    allocated,
    canProceed: remaining >= RATE_LIMIT_CONFIG.quotaThreshold,
    nextResetAt: nextReset,
  };
}

/**
 * Track quota usage after an API call
 * Uses admin client to bypass RLS for server-side quota tracking
 */
export async function trackQuotaUsage(
  clientId: string,
  apiType: 'GSC' | 'SERPER' | 'GEMINI' = 'GSC',
  count: number = 1
): Promise<void> {
  const supabase = await getAdminClient();
  const today = new Date().toISOString().split('T')[0];

  // Upsert quota tracking record
  const quotaEntry: ApiQuotaTrackingInsert = {
    client_id: clientId,
    api_type: apiType,
    quota_date: today,
    allocated_quota: DEFAULT_DAILY_QUOTA,
    used_quota: count,
  };

  const { error } = await supabase
    .from('api_quota_tracking')
    .upsert(quotaEntry as never, {
      onConflict: 'client_id,api_type,quota_date',
      ignoreDuplicates: false,
    });

  if (error) {
    // If upsert fails, try to update existing
    const { error: updateError } = await supabase
      .from('api_quota_tracking')
      .update({ used_quota: count } as never)
      .eq('client_id', clientId)
      .eq('api_type', apiType)
      .eq('quota_date', today);

    if (updateError) {
      console.error('Error tracking quota:', updateError);
    }
  }
}

/**
 * Get full quota status for display
 */
export async function getQuotaStatus(clientId: string): Promise<QuotaStatus> {
  return checkQuota(clientId);
}

// =============================================================================
// RATE LIMITING WITH EXPONENTIAL BACKOFF
// =============================================================================

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate backoff delay for retry attempt
 */
function calculateBackoffDelay(attempt: number): number {
  const { minDelay, maxDelay } = RATE_LIMIT_CONFIG.backoff;
  // Exponential backoff: minDelay * 2^attempt
  const delay = minDelay * Math.pow(2, attempt);
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Execute a function with rate limiting and exponential backoff
 */
export async function withRateLimit<T>(
  clientId: string,
  fn: () => Promise<T>,
  options: {
    trackUsage?: boolean;
    usageCount?: number;
  } = {}
): Promise<T> {
  const { trackUsage = true, usageCount = 1 } = options;

  // Check quota before proceeding
  const quota = await checkQuota(clientId);

  if (!quota.canProceed) {
    console.log(`Quota low (${quota.remaining} remaining). Sleeping for ${RATE_LIMIT_CONFIG.sleepDuration}ms...`);
    await sleep(RATE_LIMIT_CONFIG.sleepDuration);

    // Check again after sleep
    const quotaAfterSleep = await checkQuota(clientId);
    if (!quotaAfterSleep.canProceed) {
      throw new Error(
        `API quota exhausted. ${quotaAfterSleep.remaining} calls remaining. ` +
        `Resets at ${quotaAfterSleep.nextResetAt.toISOString()}`
      );
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RATE_LIMIT_CONFIG.retries; attempt++) {
    try {
      const result = await fn();

      // Track usage on success
      if (trackUsage) {
        await trackQuotaUsage(clientId, 'GSC', usageCount);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if this is a rate limit error
      const isRateLimitError =
        (error as { status?: number })?.status === 429 ||
        (error as Error)?.message?.includes('rate limit') ||
        (error as Error)?.message?.includes('quota');

      if (!isRateLimitError || attempt === RATE_LIMIT_CONFIG.retries) {
        // Not a rate limit error or we've exhausted retries
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt);
      console.log(
        `Rate limit hit. Attempt ${attempt + 1}/${RATE_LIMIT_CONFIG.retries + 1}. ` +
        `Retrying in ${Math.round(delay / 1000)}s...`
      );

      await sleep(delay);
    }
  }

  throw lastError || new Error('Rate limit retries exhausted');
}

/**
 * Add stagger delay between operations
 */
export async function withStagger<T>(fn: () => Promise<T>): Promise<T> {
  const result = await fn();
  await sleep(RATE_LIMIT_CONFIG.staggerDelay);
  return result;
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  openedAt: number;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 300000, // 5 minutes
  halfOpenRequests: 1,
};

/**
 * Get or create circuit breaker state for a client
 */
function getCircuitBreaker(clientId: string): CircuitBreakerState {
  if (!circuitBreakers.has(clientId)) {
    circuitBreakers.set(clientId, {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
      openedAt: 0,
    });
  }
  return circuitBreakers.get(clientId)!;
}

/**
 * Execute function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  clientId: string,
  fn: () => Promise<T>
): Promise<T> {
  const state = getCircuitBreaker(clientId);
  const now = Date.now();

  // Check if circuit is open
  if (state.isOpen) {
    const timeSinceOpen = now - state.openedAt;

    if (timeSinceOpen < CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      throw new Error(
        `Circuit breaker open for client ${clientId}. ` +
        `Retry after ${Math.round((CIRCUIT_BREAKER_CONFIG.resetTimeout - timeSinceOpen) / 1000)}s`
      );
    }

    // Half-open: allow one request through
    console.log(`Circuit breaker half-open for ${clientId}. Testing...`);
  }

  try {
    const result = await fn();

    // Success: reset circuit breaker
    state.failures = 0;
    state.isOpen = false;
    state.openedAt = 0;

    return result;
  } catch (error) {
    // Failure: increment counter
    state.failures++;
    state.lastFailure = now;

    if (state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      state.isOpen = true;
      state.openedAt = now;
      console.error(`Circuit breaker opened for ${clientId} after ${state.failures} failures`);
    }

    throw error;
  }
}

// =============================================================================
// COMBINED PROTECTION
// =============================================================================

/**
 * Execute a GSC API call with full protection:
 * - Circuit breaker
 * - Rate limiting with exponential backoff
 * - Quota tracking
 * - Stagger delay
 */
export async function executeWithProtection<T>(
  clientId: string,
  fn: () => Promise<T>,
  options: {
    trackUsage?: boolean;
    addStagger?: boolean;
  } = {}
): Promise<T> {
  const { trackUsage = true, addStagger = false } = options;

  return withCircuitBreaker(clientId, async () => {
    const result = await withRateLimit(clientId, fn, { trackUsage });

    if (addStagger) {
      await sleep(RATE_LIMIT_CONFIG.staggerDelay);
    }

    return result;
  });
}
