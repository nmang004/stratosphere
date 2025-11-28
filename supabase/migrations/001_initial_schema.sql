-- Stratosphere Database Schema
-- Initial migration: All core tables, indexes, RLS policies, and functions

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('PRIMARY', 'BACKUP', 'OBSERVER', 'EXECUTIVE');
CREATE TYPE account_manager_style AS ENUM ('SUCCINCT', 'COLLABORATIVE', 'EXECUTIVE');
CREATE TYPE alert_severity AS ENUM ('CRITICAL', 'WARNING', 'INFO');
CREATE TYPE touchpoint_type AS ENUM ('EMAIL_SENT', 'EMAIL_RECEIVED', 'MEETING', 'SLACK', 'TICKET_REPLY');
CREATE TYPE event_type AS ENUM ('HOLIDAY', 'ALGORITHM_UPDATE', 'CLIENT_PROMO', 'INDUSTRY_EVENT');
CREATE TYPE impact_category AS ENUM ('TRAFFIC', 'RANKING', 'CONVERSION');
CREATE TYPE experiment_snapshot_type AS ENUM ('START', 'MID', 'END');
CREATE TYPE segment_type AS ENUM ('SUBDOMAIN', 'CONTENT_TYPE', 'PAGE_GROUP');
CREATE TYPE change_type AS ENUM ('NEW_CONTENT', 'RANKING_GAIN', 'BACKLINK_SPIKE', 'TITLE_CHANGE');
CREATE TYPE deployment_type AS ENUM ('CODE', 'CONTENT', 'REDIRECT', 'SITEMAP', 'ROBOTS');
CREATE TYPE recommendation_category AS ENUM ('CONTENT', 'TECHNICAL', 'LINK', 'CONVERSION');
CREATE TYPE summary_period AS ENUM ('WEEKLY', 'MONTHLY');
CREATE TYPE api_type AS ENUM ('GSC', 'SERPER', 'GEMINI');
CREATE TYPE interaction_type AS ENUM ('BRIEFING', 'ALERT_TRIAGE', 'DRAFT', 'ANALYSIS', 'REPORT');
CREATE TYPE feedback_type AS ENUM ('HELPFUL', 'NOT_HELPFUL', 'INCORRECT');
CREATE TYPE default_view AS ENUM ('TRIAGE', 'CALENDAR', 'CLIENT_LIST');
CREATE TYPE experiment_status AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    account_manager_style account_manager_style DEFAULT 'COLLABORATIVE',
    default_view default_view DEFAULT 'TRIAGE',
    notification_preferences JSONB DEFAULT '{"email": true, "slack": false, "critical_only": false}'::jsonb,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    gsc_property_url TEXT,
    risk_score INT CHECK (risk_score >= 0 AND risk_score <= 100),
    brand_voice_guidelines TEXT,
    industry TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    is_active BOOLEAN DEFAULT true,
    logo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Client Assignments (Many-to-Many with Roles)
CREATE TABLE user_client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'PRIMARY',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    UNIQUE(user_id, client_id, role)
);

-- Service Tiers
CREATE TABLE service_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT UNIQUE NOT NULL,
    included_services TEXT[] NOT NULL,
    description TEXT,
    monthly_hours INT,
    priority_level INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Entitlements
CREATE TABLE client_entitlements (
    client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES service_tiers(id),
    custom_exclusions TEXT[] DEFAULT '{}',
    custom_inclusions TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Contracts
CREATE TABLE client_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    contract_start DATE NOT NULL,
    contract_end DATE NOT NULL,
    monthly_value NUMERIC(10,2),
    auto_renew BOOLEAN DEFAULT false,
    renewal_notice_days INT DEFAULT 30,
    contract_terms TEXT,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GSC Cache Logs
CREATE TABLE gsc_cache_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    endpoint_signature TEXT NOT NULL,
    data_payload JSONB NOT NULL,
    row_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(client_id, endpoint_signature)
);

-- GSC Aggregates (Pre-computed rollups)
CREATE TABLE gsc_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    aggregation_date DATE NOT NULL,
    segment_type segment_type NOT NULL,
    segment_value TEXT NOT NULL,
    total_clicks INT DEFAULT 0,
    total_impressions INT DEFAULT 0,
    avg_position NUMERIC(5,2),
    avg_ctr NUMERIC(5,4),
    clicks_delta_pct NUMERIC(5,2),
    impressions_delta_pct NUMERIC(5,2),
    position_delta NUMERIC(5,2),
    anomaly_detected BOOLEAN DEFAULT false,
    anomaly_score NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, aggregation_date, segment_type, segment_value)
);

-- Client Health History
CREATE TABLE client_health_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    health_score INT CHECK (health_score >= 0 AND health_score <= 100),
    traffic_trend_score NUMERIC(5,2),
    ops_velocity_score NUMERIC(5,2),
    sentiment_score NUMERIC(5,2),
    contributing_factors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, recorded_date)
);

-- Client Touchpoints
CREATE TABLE client_touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id),
    touchpoint_type touchpoint_type NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT,
    subject TEXT,
    summary TEXT,
    sentiment_score NUMERIC(3,2),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar Events
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    event_type event_type NOT NULL,
    event_date DATE NOT NULL,
    event_end_date DATE,
    geo_scope TEXT[] DEFAULT '{GLOBAL}',
    impact_category impact_category,
    expected_impact_pct NUMERIC(5,2),
    notes TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    severity alert_severity NOT NULL,
    signal TEXT NOT NULL,
    context TEXT,
    recommended_action TEXT,
    alert_payload JSONB,
    is_dismissed BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert Dismissals (Audit Trail)
CREATE TABLE alert_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    dismissed_by UUID NOT NULL REFERENCES user_profiles(id),
    dismissal_reason TEXT NOT NULL,
    action_taken TEXT,
    dismissed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiments
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hypothesis TEXT,
    status experiment_status DEFAULT 'DRAFT',
    start_date DATE,
    end_date DATE,
    target_urls TEXT[],
    control_urls TEXT[],
    success_metric TEXT,
    minimum_detectable_effect NUMERIC(5,2),
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment Snapshots
CREATE TABLE experiment_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    snapshot_type experiment_snapshot_type NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    frozen_metrics JSONB NOT NULL,
    notes TEXT,
    UNIQUE(experiment_id, snapshot_type)
);

-- Knowledge Base (RAG)
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    source_type TEXT,
    source_url TEXT,
    metadata JSONB,
    embedding vector(1536),
    expires_at TIMESTAMPTZ,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategic Recommendations
CREATE TABLE strategic_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    recommendation_date TIMESTAMPTZ DEFAULT NOW(),
    category recommendation_category NOT NULL,
    recommendation_text TEXT NOT NULL,
    rationale TEXT,
    expected_outcome TEXT,
    expected_outcome_timeframe INTERVAL,
    priority INT DEFAULT 3,
    evaluation_due_at TIMESTAMPTZ,
    actual_outcome TEXT,
    outcome_success BOOLEAN,
    learnings TEXT,
    embedding vector(1536),
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor Tracking
CREATE TABLE competitor_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    competitor_domain TEXT NOT NULL,
    competitor_name TEXT,
    tracking_keywords TEXT[],
    is_active BOOLEAN DEFAULT true,
    last_crawled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, competitor_domain)
);

-- Competitor Changes
CREATE TABLE competitor_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID NOT NULL REFERENCES competitor_tracking(id) ON DELETE CASCADE,
    change_type change_type NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    details JSONB,
    strategic_response TEXT,
    is_significant BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployment Events
CREATE TABLE deployment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    deployed_at TIMESTAMPTZ NOT NULL,
    deployment_type deployment_type NOT NULL,
    affected_urls TEXT[],
    description TEXT,
    source TEXT,
    rollback_available BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anomaly Correlations
CREATE TABLE anomaly_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    anomaly_date DATE NOT NULL,
    anomaly_type TEXT,
    deployment_id UUID REFERENCES deployment_events(id),
    calendar_event_id UUID REFERENCES calendar_events(id),
    correlation_confidence NUMERIC(3,2) CHECK (correlation_confidence >= 0 AND correlation_confidence <= 1),
    ai_analysis TEXT,
    is_confirmed BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Churn Prediction Scores
CREATE TABLE churn_prediction_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    churn_probability NUMERIC(4,3) CHECK (churn_probability >= 0 AND churn_probability <= 1),
    model_version TEXT,
    contributing_factors JSONB,
    recommended_intervention TEXT,
    intervention_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, prediction_date)
);

-- Client Portal Summaries
CREATE TABLE client_portal_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    summary_period summary_period NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    ai_generated_summary TEXT,
    key_metrics JSONB,
    highlights TEXT[],
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    is_published BOOLEAN DEFAULT false,
    UNIQUE(client_id, summary_period, period_start)
);

-- API Quota Tracking
CREATE TABLE api_quota_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    api_type api_type NOT NULL,
    quota_date DATE NOT NULL,
    allocated_quota INT NOT NULL,
    used_quota INT DEFAULT 0,
    reserved_quota INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, api_type, quota_date)
);

-- AI Interaction Logs
CREATE TABLE ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    interaction_type interaction_type NOT NULL,
    prompt_hash TEXT,
    prompt_preview TEXT,
    response_preview TEXT,
    input_tokens INT,
    output_tokens INT,
    latency_ms INT,
    model_used TEXT,
    constraint_violations TEXT[],
    user_feedback feedback_type,
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Cache lookups
CREATE INDEX idx_gsc_cache_client_expires ON gsc_cache_logs(client_id, expires_at);
CREATE INDEX idx_gsc_cache_signature ON gsc_cache_logs(endpoint_signature);

-- RAG similarity search (HNSW for speed)
CREATE INDEX idx_knowledge_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_strategic_rec_embedding ON strategic_recommendations USING hnsw (embedding vector_cosine_ops);

-- Health score queries
CREATE INDEX idx_client_risk ON clients(risk_score) WHERE risk_score < 40;
CREATE INDEX idx_client_active ON clients(is_active) WHERE is_active = true;
CREATE INDEX idx_health_history_client_date ON client_health_history(client_id, recorded_date DESC);

-- Calendar event lookups
CREATE INDEX idx_calendar_date ON calendar_events(event_date);
CREATE INDEX idx_calendar_date_range ON calendar_events(event_date, event_end_date);
CREATE INDEX idx_calendar_type ON calendar_events(event_type);

-- Churn prediction lookups
CREATE INDEX idx_churn_client_date ON churn_prediction_scores(client_id, prediction_date DESC);
CREATE INDEX idx_churn_high_risk ON churn_prediction_scores(churn_probability) WHERE churn_probability > 0.65;

-- Deployment correlation lookups
CREATE INDEX idx_deployment_client_date ON deployment_events(client_id, deployed_at);

-- User assignment lookups
CREATE INDEX idx_user_assignments_user ON user_client_assignments(user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_user_assignments_client ON user_client_assignments(client_id) WHERE ended_at IS NULL;

-- Contract renewal alerts (without partial index since CURRENT_DATE is not immutable)
CREATE INDEX idx_contracts_expiring ON client_contracts(contract_end);
CREATE INDEX idx_contracts_client ON client_contracts(client_id);

-- AI interaction analytics
CREATE INDEX idx_ai_logs_date_type ON ai_interaction_logs(created_at, interaction_type);
CREATE INDEX idx_ai_logs_feedback ON ai_interaction_logs(user_feedback) WHERE user_feedback IS NOT NULL;
CREATE INDEX idx_ai_logs_user ON ai_interaction_logs(user_id);

-- Alert queries
CREATE INDEX idx_alerts_client_severity ON alerts(client_id, severity) WHERE NOT is_dismissed;
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_active ON alerts(is_dismissed, created_at DESC) WHERE NOT is_dismissed;

-- Touchpoint queries
CREATE INDEX idx_touchpoints_client_date ON client_touchpoints(client_id, occurred_at DESC);
CREATE INDEX idx_touchpoints_type ON client_touchpoints(touchpoint_type);

-- Aggregate queries
CREATE INDEX idx_aggregates_client_date ON gsc_aggregates(client_id, aggregation_date DESC);
CREATE INDEX idx_aggregates_anomaly ON gsc_aggregates(client_id) WHERE anomaly_detected = true;

-- Experiment queries
CREATE INDEX idx_experiments_client ON experiments(client_id);
CREATE INDEX idx_experiments_status ON experiments(status) WHERE status = 'RUNNING';

-- Competitor queries
CREATE INDEX idx_competitors_client ON competitor_tracking(client_id) WHERE is_active = true;

-- Knowledge base queries
CREATE INDEX idx_knowledge_client ON knowledge_base(client_id);
CREATE INDEX idx_knowledge_expires ON knowledge_base(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_cache_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_prediction_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_quota_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;
-- calendar_events and service_tiers are global, no RLS needed

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- User Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Clients: Users can only view clients they're assigned to
CREATE POLICY "Users can view assigned clients" ON clients
    FOR SELECT USING (
        id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- User Client Assignments: Users can view their own assignments
CREATE POLICY "Users can view their assignments" ON user_client_assignments
    FOR SELECT USING (user_id = auth.uid());

-- Client Entitlements: View if assigned to client
CREATE POLICY "Users can view client entitlements" ON client_entitlements
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Client Contracts: View if assigned to client
CREATE POLICY "Users can view client contracts" ON client_contracts
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- GSC Cache Logs: View if assigned to client
CREATE POLICY "Users can view client GSC cache" ON gsc_cache_logs
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- GSC Aggregates: View if assigned to client
CREATE POLICY "Users can view client GSC aggregates" ON gsc_aggregates
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Client Health History: View if assigned to client
CREATE POLICY "Users can view client health history" ON client_health_history
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Client Touchpoints: View if assigned to client
CREATE POLICY "Users can view client touchpoints" ON client_touchpoints
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

CREATE POLICY "Users can insert touchpoints for assigned clients" ON client_touchpoints
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Alerts: View if assigned to client
CREATE POLICY "Users can view client alerts" ON alerts
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

CREATE POLICY "Users can update alerts for assigned clients" ON alerts
    FOR UPDATE USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Alert Dismissals: View if assigned to client via alert
CREATE POLICY "Users can view alert dismissals" ON alert_dismissals
    FOR SELECT USING (
        alert_id IN (
            SELECT a.id FROM alerts a
            JOIN user_client_assignments uca ON a.client_id = uca.client_id
            WHERE uca.user_id = auth.uid() AND uca.ended_at IS NULL
        )
    );

CREATE POLICY "Users can insert alert dismissals" ON alert_dismissals
    FOR INSERT WITH CHECK (dismissed_by = auth.uid());

-- Experiments: View if assigned to client
CREATE POLICY "Users can view client experiments" ON experiments
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

CREATE POLICY "Users can manage experiments for assigned clients" ON experiments
    FOR ALL USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Experiment Snapshots: View if can view experiment
CREATE POLICY "Users can view experiment snapshots" ON experiment_snapshots
    FOR SELECT USING (
        experiment_id IN (
            SELECT e.id FROM experiments e
            JOIN user_client_assignments uca ON e.client_id = uca.client_id
            WHERE uca.user_id = auth.uid() AND uca.ended_at IS NULL
        )
    );

-- Knowledge Base: View if assigned to client (or global if client_id is null)
CREATE POLICY "Users can view knowledge base" ON knowledge_base
    FOR SELECT USING (
        client_id IS NULL OR
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Strategic Recommendations: View if assigned to client
CREATE POLICY "Users can view strategic recommendations" ON strategic_recommendations
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

CREATE POLICY "Users can manage recommendations for assigned clients" ON strategic_recommendations
    FOR ALL USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Competitor Tracking: View if assigned to client
CREATE POLICY "Users can view competitor tracking" ON competitor_tracking
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Competitor Changes: View if can view competitor
CREATE POLICY "Users can view competitor changes" ON competitor_changes
    FOR SELECT USING (
        competitor_id IN (
            SELECT ct.id FROM competitor_tracking ct
            JOIN user_client_assignments uca ON ct.client_id = uca.client_id
            WHERE uca.user_id = auth.uid() AND uca.ended_at IS NULL
        )
    );

-- Deployment Events: View if assigned to client
CREATE POLICY "Users can view deployment events" ON deployment_events
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Anomaly Correlations: View if assigned to client
CREATE POLICY "Users can view anomaly correlations" ON anomaly_correlations
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Churn Prediction Scores: View if assigned to client
CREATE POLICY "Users can view churn predictions" ON churn_prediction_scores
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- Client Portal Summaries: View if assigned to client
CREATE POLICY "Users can view portal summaries" ON client_portal_summaries
    FOR SELECT USING (
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- API Quota Tracking: View if assigned to client (or global if client_id is null)
CREATE POLICY "Users can view API quota" ON api_quota_tracking
    FOR SELECT USING (
        client_id IS NULL OR
        client_id IN (
            SELECT client_id FROM user_client_assignments
            WHERE user_id = auth.uid() AND ended_at IS NULL
        )
    );

-- AI Interaction Logs: Users can view their own logs
CREATE POLICY "Users can view own AI logs" ON ai_interaction_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI logs" ON ai_interaction_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own AI logs" ON ai_interaction_logs
    FOR UPDATE USING (user_id = auth.uid());

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to calculate health score
CREATE OR REPLACE FUNCTION calculate_health_score(p_client_id UUID)
RETURNS INT AS $$
DECLARE
    v_traffic_trend NUMERIC;
    v_ops_velocity NUMERIC;
    v_sentiment NUMERIC;
    v_final_score INT;
BEGIN
    -- Traffic trend (from GSC aggregates, last 30 days)
    SELECT COALESCE(AVG(clicks_delta_pct), 0) INTO v_traffic_trend
    FROM gsc_aggregates
    WHERE client_id = p_client_id
    AND aggregation_date > CURRENT_DATE - INTERVAL '30 days'
    AND segment_type = 'PAGE_GROUP';

    -- Normalize to 0-100 (assuming delta_pct ranges from -50 to +50)
    v_traffic_trend := GREATEST(0, LEAST(100, 50 + v_traffic_trend));

    -- Ops velocity (based on recency of touchpoints)
    SELECT CASE
        WHEN MAX(occurred_at) > NOW() - INTERVAL '7 days' THEN 100
        WHEN MAX(occurred_at) > NOW() - INTERVAL '14 days' THEN 70
        WHEN MAX(occurred_at) > NOW() - INTERVAL '21 days' THEN 40
        ELSE 20
    END INTO v_ops_velocity
    FROM client_touchpoints WHERE client_id = p_client_id;

    -- Default if no touchpoints
    v_ops_velocity := COALESCE(v_ops_velocity, 50);

    -- Sentiment (average from recent touchpoints, placeholder if none)
    SELECT COALESCE(AVG(sentiment_score) * 100, 70) INTO v_sentiment
    FROM client_touchpoints
    WHERE client_id = p_client_id
    AND occurred_at > NOW() - INTERVAL '30 days';

    -- Weighted calculation (weights sum to 1.0)
    v_final_score := (0.4 * v_traffic_trend + 0.3 * v_ops_velocity + 0.3 * v_sentiment)::INT;

    -- Ensure within bounds
    v_final_score := GREATEST(0, LEAST(100, v_final_score));

    -- Update client risk_score
    UPDATE clients SET risk_score = v_final_score, updated_at = NOW() WHERE id = p_client_id;

    -- Log to history
    INSERT INTO client_health_history (
        client_id,
        recorded_date,
        health_score,
        traffic_trend_score,
        ops_velocity_score,
        sentiment_score,
        contributing_factors
    )
    VALUES (
        p_client_id,
        CURRENT_DATE,
        v_final_score,
        v_traffic_trend,
        v_ops_velocity,
        v_sentiment,
        jsonb_build_object(
            'traffic_weight', 0.4,
            'ops_weight', 0.3,
            'sentiment_weight', 0.3
        )
    )
    ON CONFLICT (client_id, recorded_date) DO UPDATE SET
        health_score = EXCLUDED.health_score,
        traffic_trend_score = EXCLUDED.traffic_trend_score,
        ops_velocity_score = EXCLUDED.ops_velocity_score,
        sentiment_score = EXCLUDED.sentiment_score,
        contributing_factors = EXCLUDED.contributing_factors;

    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check data threshold (minimum 14 days for AI analysis)
CREATE OR REPLACE FUNCTION check_data_threshold(p_client_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_days_of_data INT;
    v_has_minimum BOOLEAN;
    v_first_date DATE;
    v_last_date DATE;
BEGIN
    SELECT
        COUNT(DISTINCT aggregation_date),
        MIN(aggregation_date),
        MAX(aggregation_date)
    INTO v_days_of_data, v_first_date, v_last_date
    FROM gsc_aggregates WHERE client_id = p_client_id;

    v_has_minimum := v_days_of_data >= 14;

    RETURN jsonb_build_object(
        'days_of_data', v_days_of_data,
        'has_minimum', v_has_minimum,
        'minimum_required', 14,
        'first_date', v_first_date,
        'last_date', v_last_date,
        'confidence_level', CASE
            WHEN v_days_of_data >= 90 THEN 'VERY_HIGH'
            WHEN v_days_of_data >= 30 THEN 'HIGH'
            WHEN v_days_of_data >= 14 THEN 'MEDIUM'
            ELSE 'LOW'
        END,
        'recommendation', CASE
            WHEN v_days_of_data >= 14 THEN 'Sufficient data for trend analysis'
            ELSE 'Wait for more data before running AI analysis'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cache freshness for GSC data
CREATE OR REPLACE FUNCTION get_gsc_cache_freshness(p_client_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_last_sync TIMESTAMPTZ;
    v_hours_old NUMERIC;
    v_is_stale BOOLEAN;
BEGIN
    SELECT MAX(created_at) INTO v_last_sync
    FROM gsc_cache_logs
    WHERE client_id = p_client_id AND expires_at > NOW();

    IF v_last_sync IS NULL THEN
        RETURN jsonb_build_object(
            'has_cache', false,
            'is_stale', true,
            'recommendation', 'No cached data. Sync required.'
        );
    END IF;

    v_hours_old := EXTRACT(EPOCH FROM (NOW() - v_last_sync)) / 3600;
    v_is_stale := v_hours_old > 12;

    RETURN jsonb_build_object(
        'has_cache', true,
        'last_sync', v_last_sync,
        'hours_old', ROUND(v_hours_old::NUMERIC, 1),
        'is_stale', v_is_stale,
        'recommendation', CASE
            WHEN v_is_stale THEN 'Data is stale (>12h old). Consider refreshing.'
            ELSE 'Data is fresh.'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate rule-based churn score (fallback if ML unavailable)
CREATE OR REPLACE FUNCTION calculate_rule_based_churn(p_client_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_days_since_touchpoint INT;
    v_health_trend NUMERIC;
    v_contract_days_remaining INT;
    v_churn_score NUMERIC;
BEGIN
    -- Days since last touchpoint (max 90 for scoring)
    SELECT LEAST(90, EXTRACT(DAY FROM NOW() - MAX(occurred_at)))::INT
    INTO v_days_since_touchpoint
    FROM client_touchpoints WHERE client_id = p_client_id;

    v_days_since_touchpoint := COALESCE(v_days_since_touchpoint, 90);

    -- Health trend (compare current to 30 days ago)
    SELECT
        COALESCE(
            (SELECT health_score FROM client_health_history
             WHERE client_id = p_client_id
             ORDER BY recorded_date DESC LIMIT 1) -
            (SELECT health_score FROM client_health_history
             WHERE client_id = p_client_id
             AND recorded_date <= CURRENT_DATE - INTERVAL '30 days'
             ORDER BY recorded_date DESC LIMIT 1),
            0
        )
    INTO v_health_trend;

    -- Days until contract ends
    SELECT EXTRACT(DAY FROM contract_end - CURRENT_DATE)::INT
    INTO v_contract_days_remaining
    FROM client_contracts
    WHERE client_id = p_client_id
    ORDER BY contract_end DESC LIMIT 1;

    v_contract_days_remaining := COALESCE(v_contract_days_remaining, 365);

    -- Calculate churn score (0-1)
    -- Factors: touchpoint recency (40%), health trend (30%), contract proximity (30%)
    v_churn_score :=
        (0.4 * (v_days_since_touchpoint / 90.0)) +
        (0.3 * GREATEST(0, LEAST(1, -v_health_trend / 30.0))) +
        (0.3 * CASE
            WHEN v_contract_days_remaining < 30 THEN 0.8
            WHEN v_contract_days_remaining < 60 THEN 0.5
            WHEN v_contract_days_remaining < 90 THEN 0.3
            ELSE 0.1
        END);

    v_churn_score := GREATEST(0, LEAST(1, v_churn_score));

    RETURN ROUND(v_churn_score, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get clients needing attention (for morning briefing)
CREATE OR REPLACE FUNCTION get_clients_needing_attention(p_user_id UUID)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    health_score INT,
    churn_probability NUMERIC,
    undismissed_alerts INT,
    days_since_touchpoint INT,
    attention_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS client_id,
        c.name AS client_name,
        c.risk_score AS health_score,
        COALESCE(cps.churn_probability, 0) AS churn_probability,
        COUNT(a.id)::INT AS undismissed_alerts,
        COALESCE(EXTRACT(DAY FROM NOW() - MAX(ct.occurred_at))::INT, 999) AS days_since_touchpoint,
        CASE
            WHEN COALESCE(cps.churn_probability, 0) > 0.65 THEN 'High churn risk'
            WHEN c.risk_score < 40 THEN 'Low health score'
            WHEN COUNT(a.id) FILTER (WHERE a.severity = 'CRITICAL') > 0 THEN 'Critical alerts'
            WHEN COALESCE(EXTRACT(DAY FROM NOW() - MAX(ct.occurred_at))::INT, 999) > 14 THEN 'No recent contact'
            ELSE 'Review recommended'
        END AS attention_reason
    FROM clients c
    JOIN user_client_assignments uca ON c.id = uca.client_id
    LEFT JOIN churn_prediction_scores cps ON c.id = cps.client_id
        AND cps.prediction_date = (SELECT MAX(prediction_date) FROM churn_prediction_scores WHERE client_id = c.id)
    LEFT JOIN alerts a ON c.id = a.client_id AND NOT a.is_dismissed
    LEFT JOIN client_touchpoints ct ON c.id = ct.client_id
    WHERE uca.user_id = p_user_id
    AND uca.ended_at IS NULL
    AND c.is_active = true
    GROUP BY c.id, c.name, c.risk_score, cps.churn_probability
    HAVING
        c.risk_score < 60
        OR COALESCE(cps.churn_probability, 0) > 0.5
        OR COUNT(a.id) > 0
        OR COALESCE(EXTRACT(DAY FROM NOW() - MAX(ct.occurred_at))::INT, 999) > 14
    ORDER BY
        COALESCE(cps.churn_probability, 0) DESC,
        c.risk_score ASC,
        COUNT(a.id) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger to auto-create user profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_experiments_updated_at
    BEFORE UPDATE ON experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_client_contracts_updated_at
    BEFORE UPDATE ON client_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_client_entitlements_updated_at
    BEFORE UPDATE ON client_entitlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
