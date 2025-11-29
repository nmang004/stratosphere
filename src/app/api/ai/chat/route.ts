/**
 * AI Chat API Route
 *
 * General AI chat endpoint using Vercel AI SDK + Gemini.
 * Supports streaming responses with constraint enforcement.
 *
 * POST /api/ai/chat
 * Body: { message: string, clientId?: string, interactionType?: InteractionType }
 * Returns: Streaming text response
 */

import { google } from '@ai-sdk/google'
import { streamText, type CoreMessage } from 'ai'
import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/ai/system-prompts'
import {
  buildAIRequestContext,
  formatEnrichedContextForPrompt,
  createAILogger,
  type AIRequestContext,
} from '@/lib/ai/middleware'
import type { InteractionType } from '@/types/database'

// Map interaction types to prompt types
const interactionTypeToPromptType: Record<string, keyof typeof import('@/lib/ai/system-prompts').INTERACTION_PROMPTS | undefined> = {
  BRIEFING: 'BRIEFING',
  ALERT_TRIAGE: 'ALERT_TRIAGE',
  DRAFT: 'DRAFT',
  ANALYSIS: 'ANALYSIS',
  REPORT: 'REPORT',
}

// Additional instructions to prevent code/tool output and use provided data
const NO_CODE_INSTRUCTION = `

CRITICAL OUTPUT RULES - YOU MUST FOLLOW THESE:
- Respond ONLY with natural language text - no exceptions
- NEVER output code blocks, function calls, tool invocations, or any code syntax
- NEVER use markdown code fences
- NEVER pretend to call functions or fetch data
- You do NOT have access to any tools, functions, or external systems

DATA USAGE RULES:
- USE the client data provided in [CLIENT DATA] section - it contains all available metrics
- DO NOT ask for data that is already provided in the context
- If GSC metrics show "No GSC data available", acknowledge this and work with available health scores
- The pre-computed delta percentages (clicks_delta_pct, impressions_delta_pct, position_delta) are already calculated - use them directly
- Provide actionable analysis based on the data you have
- If specific data is truly missing, briefly note it but still provide value with available information`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, clientId, interactionType = 'ANALYSIS', conversationHistory = [] } = body

    if (!message || typeof message !== 'string') {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build request context with authentication and optional client context
    const contextResult = await buildAIRequestContext(clientId)

    if ('error' in contextResult) {
      return Response.json(
        { error: contextResult.error },
        { status: contextResult.status }
      )
    }

    const requestContext = contextResult as AIRequestContext

    // Check for errors
    if (requestContext.errors.length > 0) {
      return Response.json(
        { error: requestContext.errors[0], errors: requestContext.errors },
        { status: 400 }
      )
    }

    // Build system prompt with user's style preference
    const style = requestContext.user.profile?.account_manager_style || 'COLLABORATIVE'
    const promptType = interactionTypeToPromptType[interactionType]

    let additionalContext = ''

    // Add client context if available (with enriched metrics data)
    if (requestContext.clientContext) {
      additionalContext = formatEnrichedContextForPrompt(requestContext.clientContext)
    }

    // Add any warnings to context
    if (requestContext.warnings.length > 0) {
      additionalContext += `\n\n## Active Warnings\n${requestContext.warnings.map(w => `- ${w}`).join('\n')}`
    }

    // Add the no-code instruction
    additionalContext += NO_CODE_INSTRUCTION

    const systemPrompt = buildSystemPrompt({
      style,
      interactionType: promptType,
      additionalContext,
    })

    // Build the user message with context prepended if available
    let userMessageContent = message
    if (requestContext.clientContext && additionalContext) {
      userMessageContent = `[CLIENT DATA - USE THIS FOR YOUR ANALYSIS]
${additionalContext}

[USER QUESTION]
${message}`
    }

    // Build messages array with conversation history
    const messages: CoreMessage[] = [
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessageContent },
    ]

    // Create logger
    const logger = createAILogger(
      requestContext.user.id,
      clientId || null,
      interactionType as InteractionType
    )

    // Track start time for latency
    const startTime = Date.now()

    // Stream response from Gemini
    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      messages,
      onFinish: async ({ text }) => {
        const latencyMs = Date.now() - startTime
        // Log the interaction
        await logger.log({
          prompt: message,
          response: text,
          latencyMs,
        })
      },
    })

    // Create a custom readable stream that outputs clean text
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            // Send each text chunk directly
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    // Create response with plain text stream
    const headers: HeadersInit = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    }

    // Add warnings to response headers
    if (requestContext.warnings.length > 0) {
      headers['X-AI-Warnings'] = JSON.stringify(requestContext.warnings)
    }

    return new Response(stream, { headers })
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    return Response.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
