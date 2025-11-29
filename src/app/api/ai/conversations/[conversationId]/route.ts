/**
 * Individual Conversation API Route
 *
 * GET /api/ai/conversations/[conversationId] - Get conversation with messages
 * PATCH /api/ai/conversations/[conversationId] - Update conversation (title, archive)
 * DELETE /api/ai/conversations/[conversationId] - Delete conversation
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
 * GET /api/ai/conversations/[conversationId]
 * Returns conversation with all messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await params

    // Fetch conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conversation, error: convError } = await (serviceClient.from as any)('ai_conversations')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Fetch messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: messages, error: msgError } = await (serviceClient.from as any)('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('[Conversation API] Messages error:', msgError)
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return Response.json({
      conversation: {
        ...conversation,
        messages: messages || [],
      },
    })
  } catch (error) {
    console.error('[Conversation API] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/ai/conversations/[conversationId]
 * Body: { title?: string, is_archived?: boolean }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await params
    const body = await request.json()
    const { title, is_archived } = body

    // Verify ownership first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: checkError } = await (serviceClient.from as any)('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (is_archived !== undefined) updates.is_archived = is_archived

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (serviceClient.from as any)('ai_conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single()

    if (error) {
      console.error('[Conversation API] Update error:', error)
      return Response.json({ error: 'Failed to update conversation' }, { status: 500 })
    }

    return Response.json({ conversation: data })
  } catch (error) {
    console.error('[Conversation API] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/ai/conversations/[conversationId]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await params

    // Verify ownership first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: checkError } = await (serviceClient.from as any)('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Delete conversation (messages will cascade)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (serviceClient.from as any)('ai_conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      console.error('[Conversation API] Delete error:', error)
      return Response.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('[Conversation API] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
