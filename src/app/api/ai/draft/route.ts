/**
 * AI Draft API Route
 *
 * Client communication drafting with scope enforcement ("The Lawyer").
 *
 * POST /api/ai/draft
 * Body: { clientId: string, draftType: string, context: string, requestedWork?: string[] }
 * Returns: { draft: string, warnings: string[], scopeViolations: string[] }
 */

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/ai/system-prompts'
import {
  buildAIRequestContext,
  formatContextForPrompt,
  validateScope,
  createAILogger,
  type AIRequestContext,
} from '@/lib/ai/middleware'
import { buildChurnWarning } from '@/lib/ai/constraints'

// Valid draft types
const DRAFT_TYPES = ['CLIENT_EMAIL', 'STATUS_UPDATE', 'RETENTION_OUTREACH', 'SCOPE_NEGOTIATION'] as const
type DraftType = typeof DRAFT_TYPES[number]

// Draft type descriptions for the AI
const DRAFT_TYPE_PROMPTS: Record<DraftType, string> = {
  CLIENT_EMAIL: `
You are drafting a professional email to a client.
- Use the client's brand voice guidelines if provided
- Be professional but personable
- Include specific data points when relevant
- End with a clear call-to-action or next steps
- Keep it concise - aim for 150-250 words`,

  STATUS_UPDATE: `
You are drafting a status update for a client.
- Start with the most important metrics or updates
- Use bullet points for easy scanning
- Highlight wins and progress
- Address any challenges transparently
- Include next steps or upcoming work`,

  RETENTION_OUTREACH: `
You are drafting a retention-focused outreach message.
- Acknowledge the client's value and our partnership
- Highlight recent successes and ROI
- Address any known concerns proactively
- Propose concrete next steps or new initiatives
- Express commitment to their success
- Be genuine, not desperate`,

  SCOPE_NEGOTIATION: `
You are drafting a message to discuss scope changes with a client.
- Clearly explain what is and isn't included in their current tier
- Position additional services as opportunities, not upsells
- Provide clear options and pricing if applicable
- Maintain a consultative, helpful tone
- Focus on the value and outcomes, not features`,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, draftType, context, requestedWork = [] } = body

    // Validation
    if (!clientId || typeof clientId !== 'string') {
      return Response.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
    }

    if (!draftType || !DRAFT_TYPES.includes(draftType)) {
      return Response.json(
        { error: `Invalid draftType. Must be one of: ${DRAFT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!context || typeof context !== 'string') {
      return Response.json(
        { error: 'context is required' },
        { status: 400 }
      )
    }

    // Build request context with authentication and client context
    const contextResult = await buildAIRequestContext(clientId)

    if ('error' in contextResult) {
      return Response.json(
        { error: contextResult.error },
        { status: contextResult.status }
      )
    }

    const requestContext = contextResult as AIRequestContext

    // Client context is required for drafts
    if (!requestContext.clientContext) {
      return Response.json(
        { error: 'Client context not found' },
        { status: 400 }
      )
    }

    const clientContext = requestContext.clientContext
    const warnings: string[] = [...requestContext.warnings]
    const scopeViolations: string[] = []

    // THE LAWYER: Check scope if work is being promised
    if (requestedWork.length > 0) {
      const scopeCheck = validateScope(
        requestedWork,
        clientContext.included_services,
        clientContext.excluded_services
      )

      if (!scopeCheck.valid) {
        scopeViolations.push(...scopeCheck.violations)
        warnings.push(
          `SCOPE WARNING: The following services are outside the client's contracted tier (${clientContext.service_tier}): ${scopeCheck.violations.join(', ')}`
        )
      }
    }

    // Add churn warning if applicable
    const churnWarning = buildChurnWarning(clientContext.churn_probability)
    if (churnWarning) {
      warnings.unshift(churnWarning)
    }

    // Build system prompt
    const style = requestContext.user.profile?.account_manager_style || 'COLLABORATIVE'
    const clientContextStr = formatContextForPrompt(clientContext)
    const draftTypePrompt = DRAFT_TYPE_PROMPTS[draftType as DraftType]

    let additionalContext = `${draftTypePrompt}

## Client Information
${clientContextStr}

## Situation/Context Provided by User
${context}`

    // Add scope violation guidance if present
    if (scopeViolations.length > 0) {
      additionalContext += `

## IMPORTANT: Scope Violations Detected
The following services mentioned are OUTSIDE the client's contracted scope:
${scopeViolations.map(v => `- ${v}`).join('\n')}

DO NOT promise or commit to these services in the draft.
Instead, either:
1. Acknowledge the request and suggest discussing a tier upgrade
2. Rephrase to focus only on in-scope services
3. Offer to schedule a call to discuss expanded services`
    }

    const systemPrompt = buildSystemPrompt({
      style,
      interactionType: 'DRAFT',
      additionalContext,
    })

    // Generate draft
    const logger = createAILogger(requestContext.user.id, clientId, 'DRAFT')
    const startTime = Date.now()

    const result = await generateText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      prompt: `Generate a ${draftType.replace('_', ' ').toLowerCase()} based on the context provided.`,
    })

    const latencyMs = Date.now() - startTime

    // Log the interaction
    await logger.log({
      prompt: `Draft type: ${draftType}, Context: ${context}`,
      response: result.text,
      latencyMs,
      constraintViolations: scopeViolations.length > 0 ? ['SCOPE_VIOLATION'] : undefined,
    })

    return Response.json({
      draft: result.text,
      warnings,
      scopeViolations,
      clientTier: clientContext.service_tier,
      dataQuality: {
        daysOfData: clientContext.data_threshold?.days_of_data,
        hasMinimum: clientContext.data_threshold?.has_minimum,
        cacheAgeHours: clientContext.cache_freshness?.hours_old,
        isStale: clientContext.cache_freshness?.is_stale,
      },
    })
  } catch (error) {
    console.error('[AI Draft] Error:', error)
    return Response.json(
      { error: 'Failed to generate draft' },
      { status: 500 }
    )
  }
}
