/**
 * Stratosphere AI Middleware
 *
 * Shared middleware functions for AI API routes.
 * Handles authentication, rate limiting, constraint enforcement, and logging.
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database, UserProfile, InteractionType } from '@/types/database'
import type { ClientAIContext } from './constraints'
import {
  buildClientContext,
  validatePreAIChecks,
  formatContextForPrompt,
  isServiceEntitled,
  type DataThresholdResult,
  type CacheFreshnessResult,
} from './constraints'
import { logAIInteraction, estimateTokens, measureLatency } from './logger'

// Service role client for bypassing RLS when needed
const serviceClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30 // 30 requests per minute

export interface AuthenticatedUser {
  id: string
  email: string
  profile: UserProfile | null
}

// Enriched client context with metrics data
export interface EnrichedClientContext extends ClientAIContext {
  health_history?: Array<{
    recorded_date: string
    health_score: number | null
    traffic_trend_score: number | null
    ops_velocity_score: number | null
    sentiment_score: number | null
  }> | null
  gsc_metrics?: Array<{
    aggregation_date: string
    segment_type: string
    segment_value: string
    total_clicks: number
    total_impressions: number
    avg_position: number | null
    avg_ctr: number | null
    clicks_delta_pct: number | null
    impressions_delta_pct: number | null
    position_delta: number | null
    anomaly_detected: boolean
  }> | null
  active_alerts?: Array<{
    severity: string
    signal: string
    context: string | null
    recommended_action: string | null
  }> | null
}

export interface AIRequestContext {
  user: AuthenticatedUser
  clientContext: EnrichedClientContext | null
  warnings: string[]
  errors: string[]
}

/**
 * Creates a Supabase client for the current request
 */
async function createRequestClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called from Server Components
          }
        },
      },
    }
  )
}

/**
 * Authenticates the current request and returns user info
 */
export async function authenticateRequest(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createRequestClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email || '',
      profile: profile || null,
    }
  } catch (err) {
    console.error('[AI Middleware] Authentication error:', err)
    return null
  }
}

/**
 * Rate limits requests per user
 */
export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Start new window
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  userLimit.count++
  return { allowed: true }
}

/**
 * Fetches full client context for AI interactions
 */
export async function fetchClientContext(
  clientId: string,
  userId: string
): Promise<{ context: ClientAIContext | null; error: string | null }> {
  try {
    // First verify user has access to this client
    const { data: assignment, error: assignmentError } = await serviceClient
      .from('user_client_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .is('ended_at', null)
      .single()

    if (assignmentError || !assignment) {
      return { context: null, error: 'You do not have access to this client' }
    }

    // Fetch client
    const { data: client, error: clientError } = await serviceClient
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return { context: null, error: 'Client not found' }
    }

    // Fetch entitlements with tier
    const { data: entitlementsRaw } = await serviceClient
      .from('client_entitlements')
      .select('*, tier:service_tiers(*)')
      .eq('client_id', clientId)
      .single()

    // Type the entitlements data
    const entitlementsData = entitlementsRaw as {
      tier: { tier_name: string; included_services: string[] } | null
      custom_exclusions: string[]
      custom_inclusions: string[]
    } | null

    const entitlements = entitlementsData ? {
      tier_name: entitlementsData.tier?.tier_name || null,
      included_services: [
        ...(entitlementsData.tier?.included_services || []),
        ...(entitlementsData.custom_inclusions || []),
      ],
      custom_exclusions: entitlementsData.custom_exclusions || [],
      custom_inclusions: entitlementsData.custom_inclusions || [],
    } : null

    // Fetch latest churn prediction
    const { data: churnData } = await serviceClient
      .from('churn_prediction_scores')
      .select('*')
      .eq('client_id', clientId)
      .order('prediction_date', { ascending: false })
      .limit(1)
      .single()

    // Fetch latest health history (last 7 days for trend)
    const { data: healthHistoryRaw } = await serviceClient
      .from('client_health_history')
      .select('*')
      .eq('client_id', clientId)
      .order('recorded_date', { ascending: false })
      .limit(7)

    const healthHistory = healthHistoryRaw as Array<{
      recorded_date: string
      health_score: number | null
      traffic_trend_score: number | null
      ops_velocity_score: number | null
      sentiment_score: number | null
    }> | null

    // Fetch latest GSC aggregates (if available)
    const { data: gscAggregatesRaw } = await serviceClient
      .from('gsc_aggregates')
      .select('*')
      .eq('client_id', clientId)
      .order('aggregation_date', { ascending: false })
      .limit(5)

    const gscAggregates = gscAggregatesRaw as Array<{
      aggregation_date: string
      segment_type: string
      segment_value: string
      total_clicks: number
      total_impressions: number
      avg_position: number | null
      avg_ctr: number | null
      clicks_delta_pct: number | null
      impressions_delta_pct: number | null
      position_delta: number | null
      anomaly_detected: boolean
    }> | null

    // Fetch active alerts for context
    const { data: activeAlertsRaw } = await serviceClient
      .from('alerts')
      .select('severity, signal, context, recommended_action')
      .eq('client_id', clientId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(5)

    const activeAlerts = activeAlertsRaw as Array<{
      severity: string
      signal: string
      context: string | null
      recommended_action: string | null
    }> | null

    // Fetch calendar events (last 30 days and next 7 days)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)

    const { data: calendarEvents } = await serviceClient
      .from('calendar_events')
      .select('event_name, event_type, event_date')
      .gte('event_date', startDate.toISOString().split('T')[0])
      .lte('event_date', endDate.toISOString().split('T')[0])
      .order('event_date', { ascending: false })

    // Fetch active alert count
    const { count: alertCount } = await serviceClient
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('is_dismissed', false)

    // Fetch last touchpoint to calculate days since
    const { data: lastTouchpointRaw } = await serviceClient
      .from('client_touchpoints')
      .select('occurred_at')
      .eq('client_id', clientId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .single()

    const lastTouchpoint = lastTouchpointRaw as { occurred_at: string } | null

    const daysSinceTouchpoint = lastTouchpoint
      ? Math.floor(
          (Date.now() - new Date(lastTouchpoint.occurred_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null

    // Build data threshold (mock for now - would call DB function in production)
    const dataThreshold: DataThresholdResult = {
      days_of_data: 21, // Mock value - would come from DB function
      has_minimum: true,
      minimum_required: 14,
      first_date: null,
      last_date: null,
      confidence_level: 'HIGH',
      recommendation: 'Data quality is sufficient for trend analysis.',
    }

    // Build cache freshness (mock for now - would check gsc_cache_logs)
    const cacheFreshness: CacheFreshnessResult = {
      has_cache: true,
      last_sync: new Date().toISOString(),
      hours_old: 6,
      is_stale: false,
      recommendation: 'Data is fresh.',
    }

    // Build context
    const context = buildClientContext(
      client,
      entitlements,
      churnData,
      dataThreshold,
      cacheFreshness,
      calendarEvents || [],
      alertCount || 0,
      daysSinceTouchpoint
    )

    // Add enriched data to context for AI
    const enrichedContext = {
      ...context,
      health_history: healthHistory,
      gsc_metrics: gscAggregates,
      active_alerts: activeAlerts,
    }

    return { context: enrichedContext, error: null }
  } catch (err) {
    console.error('[AI Middleware] Error fetching client context:', err)
    return { context: null, error: 'Failed to fetch client context' }
  }
}

/**
 * Validates scope for requested work
 */
export function validateScope(
  requestedWork: string[],
  includedServices: string[],
  excludedServices: string[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = []

  for (const work of requestedWork) {
    if (!isServiceEntitled(work, includedServices, excludedServices)) {
      violations.push(work)
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  }
}

/**
 * Builds the full AI request context
 */
export async function buildAIRequestContext(
  clientId?: string | null
): Promise<AIRequestContext | { error: string; status: number }> {
  // Authenticate user
  const user = await authenticateRequest()
  if (!user) {
    return { error: 'Unauthorized', status: 401 }
  }

  // Check rate limit
  const rateLimit = checkRateLimit(user.id)
  if (!rateLimit.allowed) {
    return {
      error: `Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`,
      status: 429,
    }
  }

  // Initialize context
  const requestContext: AIRequestContext = {
    user,
    clientContext: null,
    warnings: [],
    errors: [],
  }

  // If client ID provided, fetch client context
  if (clientId) {
    const { context, error } = await fetchClientContext(clientId, user.id)
    if (error) {
      requestContext.errors.push(error)
    } else if (context) {
      requestContext.clientContext = context

      // Run pre-AI checks
      const checks = validatePreAIChecks(context)
      requestContext.warnings.push(...checks.warnings)
      requestContext.errors.push(...checks.errors)
    }
  }

  return requestContext
}

/**
 * Formats the enriched client context for inclusion in AI prompts
 * Includes actual metrics data from health history and GSC
 */
export function formatEnrichedContextForPrompt(context: EnrichedClientContext): string {
  // Start with base context
  let result = formatContextForPrompt(context)

  // Add health history data
  if (context.health_history && context.health_history.length > 0) {
    const latestHealth = context.health_history[0]
    const healthSection = `
## Health Score Breakdown (as of ${latestHealth.recorded_date})
- Overall Health Score: ${latestHealth.health_score ?? 'N/A'}/100
- Traffic Trend Score: ${latestHealth.traffic_trend_score ?? 'N/A'}/100
- Operations Velocity Score: ${latestHealth.ops_velocity_score ?? 'N/A'}/100
- Sentiment Score: ${latestHealth.sentiment_score ?? 'N/A'}/100

Health Score Formula: Traffic (40%) + Ops Velocity (30%) + Sentiment (30%)`

    result += '\n\n' + healthSection

    // Add trend if we have multiple data points
    if (context.health_history.length > 1) {
      const oldest = context.health_history[context.health_history.length - 1]
      const newest = context.health_history[0]
      const trend = (newest.health_score ?? 0) - (oldest.health_score ?? 0)
      const trendDir = trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable'
      result += `\n- 7-day Trend: ${trendDir} (${trend > 0 ? '+' : ''}${trend} points)`
    }
  }

  // Add GSC metrics data
  if (context.gsc_metrics && context.gsc_metrics.length > 0) {
    const latestMetric = context.gsc_metrics[0]
    const gscSection = `
## SEO Performance Metrics (as of ${latestMetric.aggregation_date})
- Total Clicks: ${latestMetric.total_clicks.toLocaleString()}
- Total Impressions: ${latestMetric.total_impressions.toLocaleString()}
- Average Position: ${latestMetric.avg_position?.toFixed(1) ?? 'N/A'}
- Average CTR: ${latestMetric.avg_ctr ? (latestMetric.avg_ctr * 100).toFixed(2) + '%' : 'N/A'}

### Week-over-Week Changes (PRE-COMPUTED - use these values):
- Clicks Change: ${latestMetric.clicks_delta_pct !== null ? (latestMetric.clicks_delta_pct > 0 ? '+' : '') + latestMetric.clicks_delta_pct.toFixed(1) + '%' : 'N/A'}
- Impressions Change: ${latestMetric.impressions_delta_pct !== null ? (latestMetric.impressions_delta_pct > 0 ? '+' : '') + latestMetric.impressions_delta_pct.toFixed(1) + '%' : 'N/A'}
- Position Change: ${latestMetric.position_delta !== null ? (latestMetric.position_delta > 0 ? '+' : '') + latestMetric.position_delta.toFixed(2) : 'N/A'} (negative = improved ranking)
- Anomaly Detected: ${latestMetric.anomaly_detected ? 'YES - requires investigation' : 'No'}`

    result += '\n\n' + gscSection
  } else {
    result += '\n\n## SEO Performance Metrics\nNo GSC data available for this client yet.'
  }

  // Add active alerts
  if (context.active_alerts && context.active_alerts.length > 0) {
    const alertsSection = `
## Active Alerts Requiring Attention
${context.active_alerts.map((alert, i) => `${i + 1}. [${alert.severity}] ${alert.signal}
   Context: ${alert.context || 'N/A'}
   Recommended: ${alert.recommended_action || 'Review and triage'}`).join('\n')}`

    result += '\n\n' + alertsSection
  }

  return result
}

// Keep the original export for backward compatibility
export { formatContextForPrompt }

/**
 * Creates a wrapper that logs AI interactions
 */
export function createAILogger(
  userId: string,
  clientId: string | null,
  interactionType: InteractionType
) {
  return {
    log: async (input: {
      prompt: string
      response: string
      latencyMs: number
      constraintViolations?: string[]
    }) => {
      await logAIInteraction({
        userId,
        clientId,
        interactionType,
        promptPreview: input.prompt,
        responsePreview: input.response,
        inputTokens: estimateTokens(input.prompt),
        outputTokens: estimateTokens(input.response),
        latencyMs: input.latencyMs,
        modelUsed: 'gemini-3-pro-preview',
        constraintViolations: input.constraintViolations,
      })
    },
  }
}

export { estimateTokens, measureLatency }
