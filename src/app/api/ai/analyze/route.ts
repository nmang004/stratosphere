/**
 * AI Analyze API Route
 *
 * Data analysis with full constraint enforcement.
 *
 * POST /api/ai/analyze
 * Body: { clientId: string, analysisType: string, data?: any }
 * Returns: { analysis: string, warnings: string[], dataQuality: object }
 */

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/ai/system-prompts'
import {
  buildAIRequestContext,
  formatContextForPrompt,
  createAILogger,
  type AIRequestContext,
} from '@/lib/ai/middleware'
import { buildChurnWarning, formatEventsContext } from '@/lib/ai/constraints'

// Valid analysis types
const ANALYSIS_TYPES = ['TRAFFIC_ANOMALY', 'HEALTH_TREND', 'CHURN_RISK', 'COMPETITIVE_POSITION'] as const
type AnalysisType = typeof ANALYSIS_TYPES[number]

// Analysis type descriptions
const ANALYSIS_TYPE_PROMPTS: Record<AnalysisType, string> = {
  TRAFFIC_ANOMALY: `
You are analyzing a traffic anomaly for this client.

Structure your analysis:
1. **Observation** - What the data shows (use pre-computed deltas ONLY)
2. **Context** - Check calendar events for algorithm updates, holidays, or client promotions
3. **Likely Causes** - List 2-3 probable explanations ranked by likelihood
4. **Recommended Actions** - Specific steps to investigate or respond
5. **Confidence Level** - State your confidence (High/Medium/Low) and why

IMPORTANT: Use correlation language ("associated with", "correlated to"), never causation ("caused by", "resulted in").`,

  HEALTH_TREND: `
You are analyzing the health score trend for this client.

Structure your analysis:
1. **Current State** - Current health score and its components
2. **Trend Direction** - Is it improving, declining, or stable?
3. **Key Drivers** - Which components are driving the trend?
4. **Risk Assessment** - Potential concerns if trend continues
5. **Recommendations** - Actions to improve or maintain health

Remember: Health score = Traffic (40%) + Ops Velocity (30%) + Sentiment (30%)
Use the pre-computed scores, don't calculate manually.`,

  CHURN_RISK: `
You are assessing churn risk for this client.

Structure your analysis:
1. **Current Risk Level** - Probability and severity
2. **Contributing Factors** - What's driving the risk score?
3. **Warning Signs** - Observable behaviors or metrics
4. **Intervention Strategy** - Recommended actions to reduce risk
5. **Timeline** - Urgency of intervention needed

If ML model is unavailable, acknowledge using rule-based assessment.
Always state if this is ML-based or rule-based prediction.`,

  COMPETITIVE_POSITION: `
You are analyzing competitive positioning for this client.

Structure your analysis:
1. **Current Standing** - Position in their market/keywords
2. **Recent Changes** - Movement in rankings (use pre-computed deltas)
3. **Competitor Activity** - Observable competitor actions
4. **Opportunities** - Gaps or weaknesses to exploit
5. **Threats** - Competitive risks to address

CRITICAL: Never reference other clients' data. Only use publicly available information.`,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, analysisType, data } = body

    // Validation
    if (!clientId || typeof clientId !== 'string') {
      return Response.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
    }

    if (!analysisType || !ANALYSIS_TYPES.includes(analysisType)) {
      return Response.json(
        { error: `Invalid analysisType. Must be one of: ${ANALYSIS_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Build request context
    const contextResult = await buildAIRequestContext(clientId)

    if ('error' in contextResult) {
      return Response.json(
        { error: contextResult.error },
        { status: contextResult.status }
      )
    }

    const requestContext = contextResult as AIRequestContext

    // Client context is required for analysis
    if (!requestContext.clientContext) {
      return Response.json(
        { error: 'Client context not found' },
        { status: 400 }
      )
    }

    const clientContext = requestContext.clientContext
    const warnings: string[] = [...requestContext.warnings]

    // Check data threshold for trend analysis
    if (analysisType === 'HEALTH_TREND' || analysisType === 'TRAFFIC_ANOMALY') {
      if (clientContext.data_threshold && !clientContext.data_threshold.has_minimum) {
        warnings.push(
          `Insufficient data for trend analysis (${clientContext.data_threshold.days_of_data} days available, ${clientContext.data_threshold.minimum_required} required). Results may be unreliable.`
        )
      }
    }

    // Check cache freshness
    if (clientContext.cache_freshness?.is_stale) {
      warnings.push(
        `Data is ${Math.round(clientContext.cache_freshness.hours_old || 0)} hours old. Consider requesting a manual refresh for more accurate analysis.`
      )
    }

    // Add churn warning if applicable
    const churnWarning = buildChurnWarning(clientContext.churn_probability)
    if (churnWarning) {
      warnings.unshift(churnWarning)
    }

    // Build system prompt
    const style = requestContext.user.profile?.account_manager_style || 'COLLABORATIVE'
    const clientContextStr = formatContextForPrompt(clientContext)
    const analysisPrompt = ANALYSIS_TYPE_PROMPTS[analysisType as AnalysisType]

    // Format calendar events for temporal context
    const eventsContext = clientContext.recent_events.length > 0
      ? `## Relevant Events (Check These!)\n${clientContext.recent_events.map(e => `- ${e}`).join('\n')}`
      : '## Relevant Events\nNo calendar events in the analysis period.'

    let additionalContext = `${analysisPrompt}

## Client Context
${clientContextStr}

${eventsContext}`

    // Add any additional data provided
    if (data) {
      additionalContext += `

## Additional Data Provided
${JSON.stringify(data, null, 2)}`
    }

    // Add data quality notice
    additionalContext += `

## Data Quality Notice
- Days of data available: ${clientContext.data_threshold?.days_of_data || 'Unknown'}
- Minimum required for trends: ${clientContext.data_threshold?.minimum_required || 14}
- Cache age: ${clientContext.cache_freshness?.hours_old || 'Unknown'} hours
- Confidence level: ${clientContext.data_threshold?.confidence_level || 'Unknown'}`

    const systemPrompt = buildSystemPrompt({
      style,
      interactionType: 'ANALYSIS',
      additionalContext,
    })

    // Generate analysis
    const logger = createAILogger(requestContext.user.id, clientId, 'ANALYSIS')
    const startTime = Date.now()

    const result = await generateText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      prompt: `Perform a ${analysisType.replace('_', ' ').toLowerCase()} for this client. Use the context and data provided. Follow all constraints.`,
    })

    const latencyMs = Date.now() - startTime

    // Check for constraint violations in the response
    const constraintViolations: string[] = []
    const responseText = result.text.toLowerCase()

    // Check for manual calculation language
    if (responseText.includes('i calculated') || responseText.includes('calculating')) {
      constraintViolations.push('NO_MANUAL_MATH')
    }

    // Check for causation claims without experiments
    if ((responseText.includes('caused by') || responseText.includes('resulted in')) &&
        !responseText.includes('experiment')) {
      constraintViolations.push('STATISTICAL_RIGOR')
    }

    // Log the interaction
    await logger.log({
      prompt: `Analysis type: ${analysisType}`,
      response: result.text,
      latencyMs,
      constraintViolations: constraintViolations.length > 0 ? constraintViolations : undefined,
    })

    return Response.json({
      analysis: result.text,
      warnings,
      dataQuality: {
        daysOfData: clientContext.data_threshold?.days_of_data,
        hasMinimum: clientContext.data_threshold?.has_minimum,
        minimumRequired: clientContext.data_threshold?.minimum_required,
        confidenceLevel: clientContext.data_threshold?.confidence_level,
        cacheAgeHours: clientContext.cache_freshness?.hours_old,
        isStale: clientContext.cache_freshness?.is_stale,
        lastSync: clientContext.cache_freshness?.last_sync,
      },
      constraintViolations,
    })
  } catch (error) {
    console.error('[AI Analyze] Error:', error)
    return Response.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}
