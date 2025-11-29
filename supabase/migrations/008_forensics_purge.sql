-- =============================================================================
-- MIGRATION: 008_forensics_purge.sql
-- PURPOSE: Pivot from Client Health Dashboard to Forensics Console
-- =============================================================================

-- =============================================================================
-- PHASE 1: DROP DEPRECATED TABLES
-- WARNING: This is a destructive migration. Ensure backups exist.
-- =============================================================================

-- Drop RLS policies first (dependent on tables)
DROP POLICY IF EXISTS "Users can view own churn predictions" ON churn_prediction_scores;
DROP POLICY IF EXISTS "Users can view service tiers" ON service_tiers;
DROP POLICY IF EXISTS "Users can view own entitlements" ON client_entitlements;
DROP POLICY IF EXISTS "Users can view own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON ai_messages;
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON ai_messages;
DROP POLICY IF EXISTS "Users can view own gsc cache" ON gsc_cache_logs;
DROP POLICY IF EXISTS "Users can view own gsc aggregates" ON gsc_aggregates;

-- Drop triggers (try all possible naming conventions)
DROP TRIGGER IF EXISTS update_conversation_timestamp ON ai_messages;
DROP TRIGGER IF EXISTS generate_title_on_first_message ON ai_messages;
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON ai_messages;
DROP TRIGGER IF EXISTS trigger_generate_conversation_title ON ai_messages;

-- Drop functions with CASCADE to handle any remaining dependencies
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS generate_conversation_title() CASCADE;
DROP FUNCTION IF EXISTS search_conversations(uuid, text, integer, integer) CASCADE;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS churn_prediction_scores CASCADE;
DROP TABLE IF EXISTS client_entitlements CASCADE;
DROP TABLE IF EXISTS service_tiers CASCADE;
DROP TABLE IF EXISTS gsc_aggregates CASCADE;
DROP TABLE IF EXISTS gsc_cache_logs CASCADE;

-- =============================================================================
-- PHASE 2: CREATE NEW FORENSICS TABLES
-- =============================================================================

-- Serper.dev API Response Cache
CREATE TABLE IF NOT EXISTS serper_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    location TEXT,
    gl TEXT DEFAULT 'us',
    response JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Composite index for fast lookups
    CONSTRAINT serper_cache_unique_query UNIQUE (query, location, gl)
);

-- Index for cache cleanup
CREATE INDEX idx_serper_cache_expires ON serper_cache(expires_at);
CREATE INDEX idx_serper_cache_query ON serper_cache(query);

-- Ticket Analysis Results
CREATE TABLE IF NOT EXISTS ticket_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Input
    ticket_body TEXT NOT NULL,
    target_domain TEXT NOT NULL,
    am_persona TEXT NOT NULL CHECK (am_persona IN ('PANIC_PATTY', 'TECHNICAL_TOM', 'GHOST_GARY')),
    page_metadata JSONB,

    -- AI Result
    verdict TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    strategy TEXT,
    evidence JSONB DEFAULT '[]',
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    draft_email TEXT,

    -- Forensic Data
    forensic_data JSONB DEFAULT '{}',
    warnings JSONB DEFAULT '[]',

    -- Metadata
    model_used TEXT,
    latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ticket analyses
CREATE INDEX idx_ticket_analyses_user ON ticket_analyses(user_id);
CREATE INDEX idx_ticket_analyses_domain ON ticket_analyses(target_domain);
CREATE INDEX idx_ticket_analyses_created ON ticket_analyses(created_at DESC);
CREATE INDEX idx_ticket_analyses_verdict ON ticket_analyses(verdict);

-- =============================================================================
-- PHASE 3: ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE serper_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_analyses ENABLE ROW LEVEL SECURITY;

-- Serper cache: All authenticated users can read (shared cache)
CREATE POLICY "Authenticated users can read serper cache"
    ON serper_cache FOR SELECT
    TO authenticated
    USING (true);

-- Serper cache: Service role can insert/update/delete
CREATE POLICY "Service role can manage serper cache"
    ON serper_cache FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Ticket analyses: Users can only see their own analyses
CREATE POLICY "Users can view own ticket analyses"
    ON ticket_analyses FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own ticket analyses"
    ON ticket_analyses FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ticket analyses"
    ON ticket_analyses FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- =============================================================================
-- PHASE 4: HELPER FUNCTIONS
-- =============================================================================

-- Function to get cached Serper response or NULL
CREATE OR REPLACE FUNCTION get_serper_cache(
    p_query TEXT,
    p_location TEXT DEFAULT NULL,
    p_gl TEXT DEFAULT 'us'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response JSONB;
BEGIN
    SELECT response INTO v_response
    FROM serper_cache
    WHERE query = p_query
      AND COALESCE(location, '') = COALESCE(p_location, '')
      AND gl = p_gl
      AND expires_at > NOW();

    RETURN v_response;
END;
$$;

-- Function to set Serper cache
CREATE OR REPLACE FUNCTION set_serper_cache(
    p_query TEXT,
    p_response JSONB,
    p_location TEXT DEFAULT NULL,
    p_gl TEXT DEFAULT 'us',
    p_ttl_hours INTEGER DEFAULT 24
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO serper_cache (query, location, gl, response, expires_at)
    VALUES (p_query, p_location, p_gl, p_response, NOW() + (p_ttl_hours || ' hours')::INTERVAL)
    ON CONFLICT (query, location, gl)
    DO UPDATE SET
        response = p_response,
        expires_at = NOW() + (p_ttl_hours || ' hours')::INTERVAL,
        created_at = NOW();
END;
$$;

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_serper_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM serper_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
