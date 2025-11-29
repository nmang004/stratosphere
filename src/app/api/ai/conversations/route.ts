/**
 * AI Conversations API Route
 *
 * GET /api/ai/conversations - List conversations with filtering and search
 * POST /api/ai/conversations - Create a new conversation
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database, ConversationSearchResult } from '@/types/database'

// Service role client for certain operations
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

/**
 * GET /api/ai/conversations
 * Query params:
 * - search: search query
 * - clientId: filter by client
 * - limit: number of results (default 20)
 * - offset: pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || null
    const clientId = searchParams.get('clientId') || null
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Use the search function if search query provided, otherwise simple query
    if (search) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (serviceClient.rpc as any)('search_conversations', {
        p_user_id: user.id,
        p_search_query: search,
        p_client_id: clientId,
        p_limit: limit,
        p_offset: offset,
      })

      if (error) {
        console.error('[Conversations API] Search error:', error)
        return Response.json({ error: 'Failed to search conversations' }, { status: 500 })
      }

      const results = (data || []) as ConversationSearchResult[]
      return Response.json({
        conversations: results,
        hasMore: results.length === limit,
      })
    }

    // Simple query without search
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (serviceClient.from as any)('ai_conversations')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Conversations API] Query error:', error)
      return Response.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // Transform to match expected format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversations = (data || []).map((conv: any) => ({
      ...conv,
      client_name: conv.client?.name || null,
    }))

    return Response.json({
      conversations,
      hasMore: conversations.length === limit,
    })
  } catch (error) {
    console.error('[Conversations API] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/ai/conversations
 * Body: { clientId?: string, title?: string, interactionType?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, title, interactionType = 'ANALYSIS' } = body

    // Create conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (serviceClient.from as any)('ai_conversations')
      .insert({
        user_id: user.id,
        client_id: clientId || null,
        title: title || 'New Conversation',
        interaction_type: interactionType,
      })
      .select()
      .single()

    if (error) {
      console.error('[Conversations API] Create error:', error)
      return Response.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return Response.json({ conversation: data }, { status: 201 })
  } catch (error) {
    console.error('[Conversations API] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
