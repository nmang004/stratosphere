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

ABSOLUTE RULES - VIOLATION WILL CAUSE SYSTEM FAILURE:
1. You are a TEXT-ONLY assistant. Output ONLY plain English paragraphs and bullet points.
2. You have ZERO tools, ZERO functions, ZERO code execution ability.
3. FORBIDDEN outputs that will crash the system:
   - \`\`\` (code fences)
   - tool_code, print(), get_*, fetch_*, or ANY function syntax
   - Python, JavaScript, or any programming language
4. The client data is ALREADY PROVIDED below - use it directly in your response.
5. Start your response with analysis, NOT with asking for data.
6. If data shows "N/A" or "No data", work with what IS available.

CORRECT RESPONSE FORMAT:
"Based on the health score of X and the Y% change in traffic, I recommend..."

WRONG (will crash):
\`\`\`tool_code
print(get_data())
\`\`\``

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

    // Debug logging
    console.log('[AI Chat] clientId received:', clientId)
    console.log('[AI Chat] clientContext exists:', !!requestContext.clientContext)

    // Build client data context separately from system instructions
    let clientDataContext = ''
    if (requestContext.clientContext) {
      clientDataContext = formatEnrichedContextForPrompt(requestContext.clientContext)
      console.log('[AI Chat] Client context formatted, length:', clientDataContext.length)
    } else {
      console.log('[AI Chat] No client context available')
    }

    // Add warnings to client context if any
    if (requestContext.warnings.length > 0) {
      clientDataContext += `\n\n## Active Warnings\n${requestContext.warnings.map(w => `- ${w}`).join('\n')}`
    }

    // System prompt gets the no-code instruction
    const systemPrompt = buildSystemPrompt({
      style,
      interactionType: promptType,
      additionalContext: NO_CODE_INSTRUCTION,
    })

    // Build the user message - prepend client data if available
    let userMessageContent = message
    if (clientDataContext) {
      userMessageContent = `=== CLIENT DATA FOR ANALYSIS ===
${clientDataContext}
=== END CLIENT DATA ===

USER REQUEST: ${message}

Please analyze using the client data provided above. Do not ask for data that is already shown.`
      console.log('[AI Chat] User message includes client data')
    } else {
      console.log('[AI Chat] No client data to include in message')
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

    // Create a custom readable stream that outputs clean text and filters code
    const encoder = new TextEncoder()

    // Function to clean code artifacts from text
    function cleanCodeArtifacts(text: string): string {
      return text
        // Remove ```...``` code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code with tool_code
        .replace(/`tool_code[^`]*`/g, '')
        // Remove print() calls
        .replace(/print\s*\([^)]*\)/g, '')
        // Remove get_* function calls
        .replace(/get_\w+\s*\([^)]*\)/g, '')
        // Remove lines that are just function calls
        .replace(/^\s*\w+\s*\([^)]*\)\s*$/gm, '')
        // Clean up extra newlines
        .replace(/\n{3,}/g, '\n\n')
    }

    let fullResponse = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullResponse += chunk
          }

          // Clean the full response before sending
          const cleanedResponse = cleanCodeArtifacts(fullResponse)
          controller.enqueue(encoder.encode(cleanedResponse))
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
