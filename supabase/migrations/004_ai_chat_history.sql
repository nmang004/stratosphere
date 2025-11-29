-- ============================================================================
-- AI Chat History Tables
-- ============================================================================
-- Stores conversation history for AI chat interactions
-- Supports per-user and per-client filtering, search, and conversation resume

-- Conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    summary TEXT, -- AI-generated summary of conversation
    interaction_type TEXT DEFAULT 'ANALYSIS',
    message_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_client_id ON ai_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_search ON ai_conversations USING gin(to_tsvector('english', title || ' ' || COALESCE(summary, '')));
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);

-- Full text search index on messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_search ON ai_messages USING gin(to_tsvector('english', content));

-- Row Level Security
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see their own conversations
CREATE POLICY "Users can view own conversations" ON ai_conversations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations" ON ai_conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations" ON ai_conversations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations" ON ai_conversations
    FOR DELETE USING (user_id = auth.uid());

-- Messages: Users can access messages in their conversations
CREATE POLICY "Users can view messages in own conversations" ON ai_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM ai_conversations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in own conversations" ON ai_messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM ai_conversations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages in own conversations" ON ai_messages
    FOR DELETE USING (
        conversation_id IN (
            SELECT id FROM ai_conversations WHERE user_id = auth.uid()
        )
    );

-- Function to update conversation metadata
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_conversations
    SET
        updated_at = NOW(),
        message_count = (
            SELECT COUNT(*) FROM ai_messages WHERE conversation_id = NEW.conversation_id
        )
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation when message added
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON ai_messages;
CREATE TRIGGER trigger_update_conversation_on_message
    AFTER INSERT ON ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();

-- Function to auto-generate conversation title from first message
CREATE OR REPLACE FUNCTION generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update title if it's still the default
    IF EXISTS (
        SELECT 1 FROM ai_conversations
        WHERE id = NEW.conversation_id
        AND title = 'New Conversation'
        AND NEW.role = 'user'
    ) THEN
        UPDATE ai_conversations
        SET title = LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate title
DROP TRIGGER IF EXISTS trigger_generate_conversation_title ON ai_messages;
CREATE TRIGGER trigger_generate_conversation_title
    AFTER INSERT ON ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION generate_conversation_title();

-- Search function for conversations
CREATE OR REPLACE FUNCTION search_conversations(
    p_user_id UUID,
    p_search_query TEXT DEFAULT NULL,
    p_client_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    client_id UUID,
    title TEXT,
    summary TEXT,
    interaction_type TEXT,
    message_count INTEGER,
    is_archived BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    client_name TEXT,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.user_id,
        c.client_id,
        c.title,
        c.summary,
        c.interaction_type,
        c.message_count,
        c.is_archived,
        c.created_at,
        c.updated_at,
        cl.name as client_name,
        CASE
            WHEN p_search_query IS NOT NULL THEN
                ts_rank(
                    to_tsvector('english', c.title || ' ' || COALESCE(c.summary, '')),
                    plainto_tsquery('english', p_search_query)
                )
            ELSE 1.0
        END as relevance
    FROM ai_conversations c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.user_id = p_user_id
    AND (p_client_id IS NULL OR c.client_id = p_client_id)
    AND (
        p_search_query IS NULL
        OR to_tsvector('english', c.title || ' ' || COALESCE(c.summary, '')) @@ plainto_tsquery('english', p_search_query)
        OR EXISTS (
            SELECT 1 FROM ai_messages m
            WHERE m.conversation_id = c.id
            AND to_tsvector('english', m.content) @@ plainto_tsquery('english', p_search_query)
        )
    )
    AND c.is_archived = FALSE
    ORDER BY
        CASE WHEN p_search_query IS NOT NULL THEN relevance ELSE 0 END DESC,
        c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
