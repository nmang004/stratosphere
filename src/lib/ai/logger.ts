/**
 * Stratosphere AI Interaction Logger
 *
 * Handles logging all AI interactions for auditing, analytics, and improvement.
 */

import { createClient } from '@supabase/supabase-js'
import type { InteractionType, FeedbackType } from '@/types/database'

// Use service role for logging (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AIInteractionLogInput {
  userId: string | null
  clientId?: string | null
  interactionType: InteractionType
  promptPreview?: string
  responsePreview?: string
  inputTokens?: number
  outputTokens?: number
  latencyMs?: number
  modelUsed?: string
  constraintViolations?: string[]
}

export interface AIInteractionStats {
  totalInteractions: number
  avgLatencyMs: number
  totalInputTokens: number
  totalOutputTokens: number
  interactionsByType: Record<string, number>
  constraintViolationsCount: number
}

/**
 * Generates a simple hash of the prompt for deduplication tracking
 */
export function hashPrompt(prompt: string): string {
  let hash = 0
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Estimates token count for a string (rough approximation)
 * Uses ~4 characters per token as a rough estimate for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Measures execution time of an async function
 */
export async function measureLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const start = performance.now()
  const result = await fn()
  const latencyMs = Math.round(performance.now() - start)
  return { result, latencyMs }
}

/**
 * Logs an AI interaction to the database
 */
export async function logAIInteraction(input: AIInteractionLogInput): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ai_interaction_logs')
      .insert({
        user_id: input.userId,
        client_id: input.clientId || null,
        interaction_type: input.interactionType,
        prompt_hash: input.promptPreview ? hashPrompt(input.promptPreview) : null,
        prompt_preview: input.promptPreview?.slice(0, 500) || null,
        response_preview: input.responsePreview?.slice(0, 500) || null,
        input_tokens: input.inputTokens || null,
        output_tokens: input.outputTokens || null,
        latency_ms: input.latencyMs || null,
        model_used: input.modelUsed || null,
        constraint_violations: input.constraintViolations || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[AI Logger] Failed to log interaction:', error)
      return null
    }

    return data?.id || null
  } catch (err) {
    console.error('[AI Logger] Error logging interaction:', err)
    return null
  }
}

/**
 * Updates an interaction log with feedback
 */
export async function updateInteractionFeedback(
  logId: string,
  feedback: FeedbackType,
  feedbackText?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_interaction_logs')
      .update({
        user_feedback: feedback,
        feedback_text: feedbackText || null,
      })
      .eq('id', logId)

    if (error) {
      console.error('[AI Logger] Failed to update feedback:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[AI Logger] Error updating feedback:', err)
    return false
  }
}

/**
 * Gets AI interaction statistics for a user over a period
 */
export async function getAIInteractionStats(
  userId: string,
  days: number = 30
): Promise<AIInteractionStats> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    const { data, error } = await supabase
      .from('ai_interaction_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())

    if (error) {
      console.error('[AI Logger] Failed to get stats:', error)
      return {
        totalInteractions: 0,
        avgLatencyMs: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        interactionsByType: {},
        constraintViolationsCount: 0,
      }
    }

    const logs = data || []

    // Calculate statistics
    const totalInteractions = logs.length
    const totalLatency = logs.reduce((sum, log) => sum + (log.latency_ms || 0), 0)
    const avgLatencyMs = totalInteractions > 0 ? Math.round(totalLatency / totalInteractions) : 0
    const totalInputTokens = logs.reduce((sum, log) => sum + (log.input_tokens || 0), 0)
    const totalOutputTokens = logs.reduce((sum, log) => sum + (log.output_tokens || 0), 0)

    // Count by interaction type
    const interactionsByType: Record<string, number> = {}
    logs.forEach((log) => {
      const type = log.interaction_type
      interactionsByType[type] = (interactionsByType[type] || 0) + 1
    })

    // Count constraint violations
    const constraintViolationsCount = logs.filter(
      (log) => log.constraint_violations && log.constraint_violations.length > 0
    ).length

    return {
      totalInteractions,
      avgLatencyMs,
      totalInputTokens,
      totalOutputTokens,
      interactionsByType,
      constraintViolationsCount,
    }
  } catch (err) {
    console.error('[AI Logger] Error getting stats:', err)
    return {
      totalInteractions: 0,
      avgLatencyMs: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionsByType: {},
      constraintViolationsCount: 0,
    }
  }
}
