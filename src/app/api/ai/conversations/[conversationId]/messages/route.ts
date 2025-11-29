/**
 * Conversation Messages API Route
 *
 * POST /api/ai/conversations/[conversationId]/messages - Add message to conversation
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Service role client
const serviceClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthenticatedUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
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
            // Server component
          }
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

interface RouteParams {
  params: Promise<{ conversationId: string }>
}

/**
 * POST /api/ai/conversations/[conversationId]/messages
 * Body: { role: 'user' | 'assistant', content: string, tokens_used?: number }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await params
    const body = await request.json()
    const { role, content, tokens_used } = body

    if (!role || !content) {
      return Response.json({ error: 'role and content are required' }, { status: 400 })
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Verify user owns the conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conversation, error: checkError } = await (serviceClient.from as any)('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Add message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (serviceClient.from as any)('ai_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        tokens_used: tokens_used || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[Messages API] Insert error:', error)
      return Response.json({ error: 'Failed to add message' }, { status: 500 })
    }

    return Response.json({ message: data }, { status: 201 })
  } catch (error) {
    console.error('[Messages API] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
