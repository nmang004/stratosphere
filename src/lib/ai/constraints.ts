/**
 * Stratosphere AI Constraint Helpers
 *
 * Utility functions for enforcing AI constraints and building context.
 */

import type { Json } from '@/types/database'

/**
 * Data threshold check result
 */
export interface DataThresholdResult {
  days_of_data: number
  has_minimum: boolean
  minimum_required: number
  first_date: string | null
  last_date: string | null
  confidence_level: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  recommendation: string
}

/**
 * Cache freshness check result
 */
export interface CacheFreshnessResult {
  has_cache: boolean
  last_sync?: string
  hours_old?: number
  is_stale: boolean
  recommendation: string
}

/**
 * Client context for AI interactions
 */
export interface ClientAIContext {
  client_id: string
  client_name: string
  industry: string | null
  health_score: number | null
  churn_probability: number | null
  churn_risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  service_tier: string | null
  included_services: string[]
  excluded_services: string[]
  data_threshold: DataThresholdResult | null
  cache_freshness: CacheFreshnessResult | null
  brand_voice?: string | null
  recent_events: string[]
  active_alerts_count: number
  days_since_touchpoint: number | null
}

/**
 * Determines churn risk level based on probability
 */
export function getChurnRiskLevel(probability: number | null): 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' {
  if (probability === null) return 'NONE'
  if (probability >= 0.65) return 'HIGH'
  if (probability >= 0.4) return 'MEDIUM'
  if (probability >= 0.2) return 'LOW'
  return 'NONE'
}

/**
 * Builds the churn warning prefix if needed
 */
export function buildChurnWarning(probability: number | null): string | null {
  if (probability === null || probability < 0.65) return null

  const percentage = Math.round(probability * 100)
  return `[RETENTION ALERT] This client shows elevated churn risk (${percentage}%). Consider prioritizing engagement and scheduling a check-in call.`
}

/**
 * Builds data quality warning if needed
 */
export function buildDataQualityWarning(
  threshold: DataThresholdResult | null,
  freshness: CacheFreshnessResult | null
): string | null {
  const warnings: string[] = []

  if (threshold && !threshold.has_minimum) {
    warnings.push(
      `Insufficient data for trend analysis (${threshold.days_of_data} days available, ${threshold.minimum_required} required).`
    )
  }

  if (freshness && freshness.is_stale && freshness.hours_old) {
    warnings.push(
      `Data is ${Math.round(freshness.hours_old)} hours old. Consider requesting a manual refresh.`
    )
  }

  return warnings.length > 0 ? warnings.join(' ') : null
}

/**
 * Checks if a service is included in client's entitlements
 */
export function isServiceEntitled(
  service: string,
  includedServices: string[],
  excludedServices: string[]
): boolean {
  // Check explicit exclusions first
  if (excludedServices.includes(service)) return false

  // Then check inclusions
  return includedServices.includes(service)
}

/**
 * Builds the service scope message for AI context
 */
export function buildScopeContext(
  includedServices: string[],
  excludedServices: string[]
): string {
  return `
Available services for this client:
- Included: ${includedServices.join(', ') || 'None specified'}
- Excluded: ${excludedServices.join(', ') || 'None'}

Only recommend or promise work that falls within included services.
If the client requests excluded services, suggest discussing a tier upgrade.`
}

/**
 * Formats calendar events context for AI
 */
export function formatEventsContext(events: Array<{
  event_name: string
  event_type: string
  event_date: string
  impact_category?: string | null
}>): string {
  if (events.length === 0) {
    return 'No relevant calendar events in the analysis period.'
  }

  const eventLines = events.map(e => {
    const impact = e.impact_category ? ` (${e.impact_category} impact)` : ''
    return `- ${e.event_date}: ${e.event_name} [${e.event_type}]${impact}`
  })

  return `Relevant calendar events:\n${eventLines.join('\n')}`
}

/**
 * Builds the complete AI context object for a client interaction
 */
export function buildClientContext(
  client: {
    id: string
    name: string
    industry: string | null
    risk_score: number | null
    brand_voice_guidelines: string | null
  },
  entitlements: {
    tier_name: string | null
    included_services: string[]
    custom_exclusions: string[]
    custom_inclusions: string[]
  } | null,
  churnPrediction: { churn_probability: number | null } | null,
  dataThreshold: DataThresholdResult | null,
  cacheFreshness: CacheFreshnessResult | null,
  calendarEvents: Array<{ event_name: string; event_type: string; event_date: string }>,
  alertsCount: number,
  daysSinceTouchpoint: number | null
): ClientAIContext {
  const included = [
    ...(entitlements?.included_services || []),
    ...(entitlements?.custom_inclusions || [])
  ]
  const excluded = entitlements?.custom_exclusions || []

  return {
    client_id: client.id,
    client_name: client.name,
    industry: client.industry,
    health_score: client.risk_score,
    churn_probability: churnPrediction?.churn_probability ?? null,
    churn_risk_level: getChurnRiskLevel(churnPrediction?.churn_probability ?? null),
    service_tier: entitlements?.tier_name ?? null,
    included_services: included,
    excluded_services: excluded,
    data_threshold: dataThreshold,
    cache_freshness: cacheFreshness,
    brand_voice: client.brand_voice_guidelines,
    recent_events: calendarEvents.map(e => `${e.event_date}: ${e.event_name}`),
    active_alerts_count: alertsCount,
    days_since_touchpoint: daysSinceTouchpoint,
  }
}

/**
 * Formats the client context for inclusion in AI prompts
 */
export function formatContextForPrompt(context: ClientAIContext): string {
  const sections: string[] = []

  // Client basics
  sections.push(`## Client Context
- Name: ${context.client_name}
- Industry: ${context.industry || 'Not specified'}
- Health Score: ${context.health_score ?? 'N/A'}/100
- Service Tier: ${context.service_tier || 'Not specified'}`)

  // Churn warning (CRITICAL - must come early)
  const churnWarning = buildChurnWarning(context.churn_probability)
  if (churnWarning) {
    sections.unshift(churnWarning) // Put at the very top
  }

  // Data quality warnings
  const dataWarning = buildDataQualityWarning(context.data_threshold, context.cache_freshness)
  if (dataWarning) {
    sections.push(`## Data Quality Notice\n${dataWarning}`)
  }

  // Service entitlements
  sections.push(buildScopeContext(context.included_services, context.excluded_services))

  // Recent events
  if (context.recent_events.length > 0) {
    sections.push(`## Recent Calendar Events\n${context.recent_events.map(e => `- ${e}`).join('\n')}`)
  }

  // Engagement status
  if (context.days_since_touchpoint !== null) {
    const urgency = context.days_since_touchpoint > 14 ? ' (OVERDUE)' : ''
    sections.push(`## Engagement Status
- Days since last touchpoint: ${context.days_since_touchpoint}${urgency}
- Active alerts: ${context.active_alerts_count}`)
  }

  // Brand voice
  if (context.brand_voice) {
    sections.push(`## Brand Voice Guidelines\n${context.brand_voice}`)
  }

  return sections.join('\n\n')
}

/**
 * Validates that required constraints are present before AI call
 */
export function validatePreAIChecks(context: ClientAIContext): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for data threshold
  if (!context.data_threshold) {
    warnings.push('Data threshold not checked. Trend analysis may be unreliable.')
  } else if (!context.data_threshold.has_minimum) {
    warnings.push(
      `Only ${context.data_threshold.days_of_data} days of data available. Trend analysis requires ${context.data_threshold.minimum_required} days.`
    )
  }

  // Check for cache freshness
  if (!context.cache_freshness) {
    warnings.push('Cache freshness not checked. Data may be stale.')
  } else if (context.cache_freshness.is_stale) {
    warnings.push('GSC data is stale (>12 hours old).')
  }

  // Check for service tier
  if (!context.service_tier) {
    warnings.push('Service tier unknown. Cannot validate entitlements.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
