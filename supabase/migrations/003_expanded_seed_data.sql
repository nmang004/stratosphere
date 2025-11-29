-- Stratosphere Expanded Seed Data
-- Additional test clients for diverse demo scenarios
-- Run this migration after 002_seed_data.sql

-- =============================================================================
-- ADDITIONAL CLIENTS (5 more for diverse scenarios)
-- =============================================================================

INSERT INTO clients (id, name, domain, gsc_property_url, risk_score, industry, timezone, is_active, brand_voice_guidelines, notes)
VALUES
    -- Critical health, high churn, contract expiring soon
    ('c4444444-4444-4444-4444-444444444444', 'RetailMax Corp', 'retailmax.com', 'sc-domain:retailmax.com', 32, 'E-commerce', 'America/New_York', true,
     'Bold, action-oriented, deal-focused. Use urgency language. Target bargain hunters and value shoppers.',
     'Major traffic issues after site migration. Contract expiring in 15 days. HIGH PRIORITY for retention.'),

    -- Healthy, low churn, long-term contract (ideal client)
    ('c5555555-5555-5555-5555-555555555555', 'HealthTech Pro', 'healthtechpro.com', 'sc-domain:healthtechpro.com', 85, 'Healthcare Technology', 'America/Los_Angeles', true,
     'Professional, innovative, compliance-focused. Balance technical accuracy with accessibility.',
     'Model client. Consistent growth, great communication. Good case study candidate.'),

    -- Starter tier, warning health, medium churn
    ('c6666666-6666-6666-6666-666666666666', 'LocalBiz Services', 'localbizservices.com', 'sc-domain:localbizservices.com', 55, 'Business Services', 'America/Denver', true,
     'Friendly, local, community-focused. Emphasize reliability and personal touch.',
     'Small business client. Budget constraints but good potential. Consider upsell to Growth tier.'),

    -- Healthy but no recent touchpoints (stale engagement)
    ('c7777777-7777-7777-7777-777777777777', 'GlobalTrade Inc', 'globaltrade.io', 'sc-domain:globaltrade.io', 72, 'Import/Export', 'America/Chicago', true,
     'Professional, global perspective, trustworthy. Use data-driven messaging.',
     'Good metrics but engagement dropped. Last meaningful contact 25 days ago. Re-engage!'),

    -- Declining trend, active experiment
    ('c8888888-8888-8888-8888-888888888888', 'CreativeStudio', 'creativestudio.design', 'sc-domain:creativestudio.design', 42, 'Design Services', 'America/New_York', true,
     'Creative, inspiring, visual-first. Emphasize portfolio and artistic excellence.',
     'Health trending down (48→42 over 7 days). Running title tag experiment to improve CTR.');

-- =============================================================================
-- CLIENT ENTITLEMENTS FOR NEW CLIENTS
-- =============================================================================

INSERT INTO client_entitlements (client_id, tier_id, custom_exclusions, custom_inclusions)
VALUES
    -- RetailMax: Enterprise tier (high value but at risk)
    ('c4444444-4444-4444-4444-444444444444', 'a1b2c3d4-3333-3333-3333-333333333333', '{}', ARRAY['emergency_support']),
    -- HealthTech Pro: Enterprise tier (model client)
    ('c5555555-5555-5555-5555-555555555555', 'a1b2c3d4-3333-3333-3333-333333333333', '{}', ARRAY['beta_features']),
    -- LocalBiz: Starter tier (budget client)
    ('c6666666-6666-6666-6666-666666666666', 'a1b2c3d4-1111-1111-1111-111111111111', '{}', '{}'),
    -- GlobalTrade: Growth tier
    ('c7777777-7777-7777-7777-777777777777', 'a1b2c3d4-2222-2222-2222-222222222222', '{}', ARRAY['quarterly_strategy_review']),
    -- CreativeStudio: Growth tier
    ('c8888888-8888-8888-8888-888888888888', 'a1b2c3d4-2222-2222-2222-222222222222', ARRAY['technical_seo'], '{}');

-- =============================================================================
-- CLIENT CONTRACTS FOR NEW CLIENTS
-- =============================================================================

INSERT INTO client_contracts (id, client_id, contract_start, contract_end, monthly_value, auto_renew, renewal_notice_days)
VALUES
    -- RetailMax: Contract expiring in ~15 days!
    ('d4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', '2024-01-01', CURRENT_DATE + INTERVAL '15 days', 12000.00, false, 30),
    -- HealthTech Pro: Long contract, auto-renew
    ('d5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555', '2024-01-01', '2026-12-31', 9500.00, true, 90),
    -- LocalBiz: Short contract cycle (6 months)
    ('d6666666-6666-6666-6666-666666666666', 'c6666666-6666-6666-6666-666666666666', '2024-07-01', '2025-06-30', 1500.00, true, 30),
    -- GlobalTrade: Standard annual
    ('d7777777-7777-7777-7777-777777777777', 'c7777777-7777-7777-7777-777777777777', '2024-04-01', '2025-03-31', 5800.00, true, 45),
    -- CreativeStudio: Quarterly renewals
    ('d8888888-8888-8888-8888-888888888888', 'c8888888-8888-8888-8888-888888888888', '2024-10-01', '2025-03-31', 3200.00, false, 30);

-- =============================================================================
-- CHURN PREDICTION SCORES FOR NEW CLIENTS
-- =============================================================================

INSERT INTO churn_prediction_scores (client_id, prediction_date, churn_probability, model_version, contributing_factors, recommended_intervention)
VALUES
    ('c4444444-4444-4444-4444-444444444444', CURRENT_DATE, 0.78, 'v2.1',
     '{"engagement_score": 0.2, "health_trend": "critical", "contract_status": "expiring_soon", "traffic_decline": true, "payment_delays": true}'::JSONB,
     'CRITICAL: Schedule executive escalation call immediately. Prepare traffic recovery roadmap and consider contract extension incentive.'),
    ('c5555555-5555-5555-5555-555555555555', CURRENT_DATE, 0.08, 'v2.1',
     '{"engagement_score": 0.95, "health_trend": "positive", "contract_status": "long_term", "traffic_growth": true}'::JSONB,
     'Low risk. Continue excellent relationship. Consider case study or referral request.'),
    ('c6666666-6666-6666-6666-666666666666', CURRENT_DATE, 0.45, 'v2.1',
     '{"engagement_score": 0.6, "health_trend": "declining", "contract_status": "stable", "budget_constraints": true}'::JSONB,
     'Monitor closely. Focus on demonstrating clear ROI for budget-conscious client. Prepare tier upgrade pitch.'),
    ('c7777777-7777-7777-7777-777777777777', CURRENT_DATE, 0.22, 'v2.1',
     '{"engagement_score": 0.4, "health_trend": "stable", "contract_status": "stable", "stale_engagement": true}'::JSONB,
     'Re-engagement needed despite good metrics. Schedule casual check-in to maintain relationship.'),
    ('c8888888-8888-8888-8888-888888888888', CURRENT_DATE, 0.52, 'v2.1',
     '{"engagement_score": 0.65, "health_trend": "negative", "contract_status": "quarterly", "active_experiment": true}'::JSONB,
     'Health declining but experiment in progress. Wait for experiment results before major intervention. Keep communication frequent.');

-- =============================================================================
-- CLIENT HEALTH HISTORY FOR NEW CLIENTS (30 days each)
-- =============================================================================

-- RetailMax: Critical and declining
INSERT INTO client_health_history (client_id, recorded_date, health_score, traffic_trend_score, ops_velocity_score, sentiment_score, contributing_factors)
SELECT
    'c4444444-4444-4444-4444-444444444444',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    GREATEST(25, 45 - (n * 0.6)::INT + (random() * 8)::INT - 4),  -- Declining from ~45 to ~30
    GREATEST(15, 35 - (n * 0.5)::NUMERIC(5,2) + (random() * 10)::NUMERIC(5,2) - 5),
    45 + (random() * 15)::NUMERIC(5,2) - 7,
    38 + (random() * 12)::NUMERIC(5,2) - 6,
    '{"traffic_weight": 0.4, "ops_weight": 0.3, "sentiment_weight": 0.3, "notes": "Site migration issues"}'::JSONB
FROM generate_series(0, 29) AS n;

-- HealthTech Pro: Healthy and stable-improving
INSERT INTO client_health_history (client_id, recorded_date, health_score, traffic_trend_score, ops_velocity_score, sentiment_score, contributing_factors)
SELECT
    'c5555555-5555-5555-5555-555555555555',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    82 + (random() * 8)::INT - 2 + (n / 15)::INT,  -- High and slightly improving
    85 + (random() * 10)::NUMERIC(5,2) - 5,
    90 + (random() * 8)::NUMERIC(5,2) - 4,
    88 + (random() * 10)::NUMERIC(5,2) - 5,
    '{"traffic_weight": 0.4, "ops_weight": 0.3, "sentiment_weight": 0.3, "notes": "Model client"}'::JSONB
FROM generate_series(0, 29) AS n;

-- LocalBiz: Warning zone, slightly declining
INSERT INTO client_health_history (client_id, recorded_date, health_score, traffic_trend_score, ops_velocity_score, sentiment_score, contributing_factors)
SELECT
    'c6666666-6666-6666-6666-666666666666',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    58 - (n / 10)::INT + (random() * 10)::INT - 5,  -- Warning zone
    52 + (random() * 15)::NUMERIC(5,2) - 7,
    60 + (random() * 18)::NUMERIC(5,2) - 9,
    55 + (random() * 14)::NUMERIC(5,2) - 7,
    '{"traffic_weight": 0.4, "ops_weight": 0.3, "sentiment_weight": 0.3, "notes": "Budget client"}'::JSONB
FROM generate_series(0, 29) AS n;

-- GlobalTrade: Healthy but flat
INSERT INTO client_health_history (client_id, recorded_date, health_score, traffic_trend_score, ops_velocity_score, sentiment_score, contributing_factors)
SELECT
    'c7777777-7777-7777-7777-777777777777',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    70 + (random() * 8)::INT - 4,  -- Stable healthy
    72 + (random() * 12)::NUMERIC(5,2) - 6,
    75 + (random() * 10)::NUMERIC(5,2) - 5,
    70 + (random() * 14)::NUMERIC(5,2) - 7,
    '{"traffic_weight": 0.4, "ops_weight": 0.3, "sentiment_weight": 0.3, "notes": "Good metrics, check engagement"}'::JSONB
FROM generate_series(0, 29) AS n;

-- CreativeStudio: Declining (48→42 over 7 days)
INSERT INTO client_health_history (client_id, recorded_date, health_score, traffic_trend_score, ops_velocity_score, sentiment_score, contributing_factors)
SELECT
    'c8888888-8888-8888-8888-888888888888',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    CASE
        WHEN n < 7 THEN 48 - n + (random() * 4)::INT - 2  -- Recent decline: 48→42
        ELSE 48 + (random() * 6)::INT - 3  -- Earlier: stable around 48
    END,
    42 + (random() * 14)::NUMERIC(5,2) - 7,
    50 + (random() * 16)::NUMERIC(5,2) - 8,
    45 + (random() * 12)::NUMERIC(5,2) - 6,
    '{"traffic_weight": 0.4, "ops_weight": 0.3, "sentiment_weight": 0.3, "notes": "Experiment in progress"}'::JSONB
FROM generate_series(0, 29) AS n;

-- =============================================================================
-- ALERTS FOR NEW CLIENTS
-- =============================================================================

INSERT INTO alerts (id, client_id, severity, signal, context, recommended_action, alert_payload, is_dismissed, created_at)
VALUES
    -- RetailMax: Multiple critical alerts
    ('f7777777-7777-7777-7777-777777777777', 'c4444444-4444-4444-4444-444444444444', 'CRITICAL',
     'Traffic dropped 45% following site migration',
     'Major URL structure changes caused indexing issues. 500+ pages returning 404.',
     'Audit redirect implementation. Submit updated sitemap. Request re-crawl.',
     '{"traffic_change": -45, "affected_section": "all", "potential_cause": "migration", "404_count": 523}'::JSONB,
     false, NOW() - INTERVAL '4 hours'),

    ('f8888888-8888-8888-8888-888888888888', 'c4444444-4444-4444-4444-444444444444', 'CRITICAL',
     'Contract expires in 15 days - no renewal discussion scheduled',
     'High-value Enterprise client with critical issues and no renewal meeting booked.',
     'Escalate to account director. Schedule emergency strategy review.',
     '{"contract_end": "15 days", "monthly_value": 12000, "renewal_status": "not_scheduled"}'::JSONB,
     false, NOW() - INTERVAL '1 hour'),

    ('f9999999-9999-9999-9999-999999999999', 'c4444444-4444-4444-4444-444444444444', 'WARNING',
     'Client sentiment declining based on recent emails',
     'Last 3 emails showed frustration about migration issues.',
     'Prepare executive apology and recovery timeline.',
     '{"sentiment_trend": "negative", "email_count": 3, "frustration_keywords": ["disappointed", "concerned", "timeline"]}'::JSONB,
     false, NOW() - INTERVAL '12 hours'),

    -- HealthTech Pro: Minor info alert
    ('fa111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'INFO',
     'New featured snippet opportunity detected',
     'Position 2-3 for "telemedicine software comparison" - could capture snippet.',
     'Add comparison table and FAQ schema to existing page.',
     '{"keyword": "telemedicine software comparison", "current_position": 2.3, "snippet_type": "table"}'::JSONB,
     false, NOW() - INTERVAL '2 days'),

    -- LocalBiz: Budget warning
    ('fb222222-2222-2222-2222-222222222222', 'c6666666-6666-6666-6666-666666666666', 'WARNING',
     'Monthly hours nearly exhausted (8/10 used)',
     'Starter tier limit approaching. Additional requests this month will be out of scope.',
     'Review remaining priorities with client. Discuss tier upgrade if needed.',
     '{"hours_used": 8, "hours_allocated": 10, "days_remaining": 12}'::JSONB,
     false, NOW() - INTERVAL '1 day'),

    -- GlobalTrade: Engagement warning
    ('fc333333-3333-3333-3333-333333333333', 'c7777777-7777-7777-7777-777777777777', 'WARNING',
     'No client touchpoint in 25 days',
     'Last interaction was a routine monthly report. No response or questions.',
     'Send friendly check-in. Propose quick sync call.',
     '{"last_touchpoint": "monthly_report", "days_since": 25}'::JSONB,
     false, NOW() - INTERVAL '3 days'),

    -- CreativeStudio: Experiment alert
    ('fd444444-4444-4444-4444-444444444444', 'c8888888-8888-8888-8888-888888888888', 'INFO',
     'Title tag experiment reaching minimum duration',
     'Experiment has been running for 18 days. 3 more days until statistically valid results.',
     'Prepare analysis framework. Schedule results review call.',
     '{"experiment_name": "Title Tag Optimization", "days_running": 18, "minimum_days": 21}'::JSONB,
     false, NOW() - INTERVAL '6 hours');

-- =============================================================================
-- CLIENT TOUCHPOINTS FOR NEW CLIENTS
-- =============================================================================

INSERT INTO client_touchpoints (client_id, touchpoint_type, occurred_at, source, subject, summary, sentiment_score, metadata)
VALUES
    -- RetailMax: Recent but strained
    ('c4444444-4444-4444-4444-444444444444', 'EMAIL_RECEIVED', NOW() - INTERVAL '4 hours', 'gmail', 'RE: Migration Issues Update',
     'Client expressed strong frustration about ongoing 404 errors. Requested urgent call with leadership.',
     0.25, '{"flagged": true, "priority": "urgent"}'::JSONB),
    ('c4444444-4444-4444-4444-444444444444', 'EMAIL_SENT', NOW() - INTERVAL '1 day', 'gmail', 'Migration Recovery Plan',
     'Sent detailed recovery plan with timeline and milestones.',
     NULL, '{"attachment": "recovery_plan_v2.pdf"}'::JSONB),
    ('c4444444-4444-4444-4444-444444444444', 'MEETING', NOW() - INTERVAL '3 days', 'zoom', 'Emergency Migration Review',
     'Crisis meeting to address migration fallout. Client unhappy but appreciated transparency.',
     0.40, '{"duration_minutes": 60, "attendees": 4}'::JSONB),

    -- HealthTech Pro: Excellent engagement
    ('c5555555-5555-5555-5555-555555555555', 'MEETING', NOW() - INTERVAL '2 days', 'zoom', 'Q1 Strategy Planning',
     'Productive strategy session. Client approved expanded content plan and budget increase.',
     0.92, '{"duration_minutes": 45, "outcome": "budget_increase_approved"}'::JSONB),
    ('c5555555-5555-5555-5555-555555555555', 'SLACK', NOW() - INTERVAL '12 hours', 'slack', 'Quick question on schema',
     'Client asked about MedicalOrganization schema. Provided implementation guide.',
     0.80, '{"channel": "healthtech-seo"}'::JSONB),
    ('c5555555-5555-5555-5555-555555555555', 'EMAIL_SENT', NOW() - INTERVAL '5 days', 'gmail', 'Featured Snippet Win Report',
     'Shared celebration of new featured snippet capture. Client very pleased.',
     NULL, '{"attachment": "snippet_win_report.pdf"}'::JSONB),

    -- LocalBiz: Moderate engagement, budget concerns
    ('c6666666-6666-6666-6666-666666666666', 'EMAIL_SENT', NOW() - INTERVAL '5 days', 'gmail', 'Monthly Report - November',
     'Sent report with focus on ROI metrics given budget sensitivity.',
     NULL, '{"attachment": "report_nov_localbiz.pdf"}'::JSONB),
    ('c6666666-6666-6666-6666-666666666666', 'EMAIL_RECEIVED', NOW() - INTERVAL '4 days', 'gmail', 'RE: Monthly Report',
     'Client appreciated ROI focus. Asked about costs for additional services.',
     0.70, '{"upsell_opportunity": true}'::JSONB),

    -- GlobalTrade: Stale engagement!
    ('c7777777-7777-7777-7777-777777777777', 'EMAIL_SENT', NOW() - INTERVAL '25 days', 'gmail', 'Monthly Report - October',
     'Standard monthly report sent. No response received.',
     NULL, '{"attachment": "report_oct_globaltrade.pdf"}'::JSONB),
    ('c7777777-7777-7777-7777-777777777777', 'MEETING', NOW() - INTERVAL '45 days', 'teams', 'Quarterly Business Review',
     'QBR went well. Client satisfied with results but seemed distracted.',
     0.65, '{"duration_minutes": 60}'::JSONB),

    -- CreativeStudio: Active communication about experiment
    ('c8888888-8888-8888-8888-888888888888', 'MEETING', NOW() - INTERVAL '4 days', 'zoom', 'Experiment Progress Check',
     'Reviewed preliminary experiment data. CTR showing promising early signs.',
     0.75, '{"duration_minutes": 30}'::JSONB),
    ('c8888888-8888-8888-8888-888888888888', 'SLACK', NOW() - INTERVAL '1 day', 'slack', 'Health score question',
     'Client noticed declining health score. Explained traffic dip and experiment impact.',
     0.60, '{"channel": "creative-seo"}'::JSONB),
    ('c8888888-8888-8888-8888-888888888888', 'EMAIL_SENT', NOW() - INTERVAL '7 days', 'gmail', 'Experiment Kickoff Confirmation',
     'Confirmed experiment parameters and success metrics with client.',
     NULL, '{"experiment_id": "b3333333-3333-3333-3333-333333333333"}'::JSONB);

-- =============================================================================
-- EXPERIMENTS FOR NEW CLIENTS
-- =============================================================================

INSERT INTO experiments (id, client_id, name, hypothesis, status, start_date, end_date, target_urls, control_urls, success_metric, minimum_detectable_effect)
VALUES
    ('b3333333-3333-3333-3333-333333333333', 'c8888888-8888-8888-8888-888888888888',
     'Creative Portfolio Title Optimization',
     'Adding emotional triggers to title tags will increase CTR for portfolio pages',
     'RUNNING', CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE + INTERVAL '3 days',
     ARRAY['https://creativestudio.design/portfolio/branding', 'https://creativestudio.design/portfolio/web-design'],
     ARRAY['https://creativestudio.design/portfolio/print', 'https://creativestudio.design/portfolio/packaging'],
     'CTR improvement from search', 8.0);

-- Experiment snapshot
INSERT INTO experiment_snapshots (experiment_id, snapshot_type, recorded_at, frozen_metrics, notes)
VALUES
    ('b3333333-3333-3333-3333-333333333333', 'START', CURRENT_DATE - INTERVAL '18 days',
     '{"target_ctr": 0.028, "control_ctr": 0.026, "target_impressions": 8500, "control_impressions": 7800}'::JSONB,
     'Baseline before title changes applied');

-- =============================================================================
-- GSC AGGREGATES FOR NEW CLIENTS (30 days)
-- =============================================================================

-- RetailMax: Steep decline
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected)
SELECT
    'c4444444-4444-4444-4444-444444444444',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP', 'products',
    GREATEST(200, 1500 - (n * 45) + (random() * 150)::INT - 75),
    GREATEST(8000, 60000 - (n * 1800) + (random() * 5000)::INT - 2500),
    18.5 + (n * 0.3)::NUMERIC(5,2) + (random() * 4)::NUMERIC(5,2) - 2,
    0.018 - (n * 0.0003)::NUMERIC(5,4) + (random() * 0.005)::NUMERIC(5,4),
    -8.5 + (random() * 6)::NUMERIC(5,2) - 3,
    -6.0 + (random() * 5)::NUMERIC(5,2) - 2.5,
    CASE WHEN n < 10 THEN true ELSE false END
FROM generate_series(0, 29) AS n;

-- HealthTech Pro: Strong and growing
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected)
SELECT
    'c5555555-5555-5555-5555-555555555555',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP', 'solutions',
    1800 + (n * 8) + (random() * 300)::INT - 150,
    55000 + (n * 200) + (random() * 8000)::INT - 4000,
    6.2 - (n * 0.02)::NUMERIC(5,2) + (random() * 2)::NUMERIC(5,2) - 1,
    0.033 + (random() * 0.008)::NUMERIC(5,4),
    4.5 + (random() * 5)::NUMERIC(5,2) - 2.5,
    3.2 + (random() * 4)::NUMERIC(5,2) - 2,
    false
FROM generate_series(0, 29) AS n;

-- LocalBiz: Modest and flat
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected)
SELECT
    'c6666666-6666-6666-6666-666666666666',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP', 'services',
    280 + (random() * 60)::INT - 30,
    12000 + (random() * 2000)::INT - 1000,
    22.5 + (random() * 5)::NUMERIC(5,2) - 2.5,
    0.023 + (random() * 0.006)::NUMERIC(5,4),
    0.8 + (random() * 4)::NUMERIC(5,2) - 2,
    0.5 + (random() * 3)::NUMERIC(5,2) - 1.5,
    false
FROM generate_series(0, 29) AS n;

-- GlobalTrade: Good metrics, stable
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected)
SELECT
    'c7777777-7777-7777-7777-777777777777',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP', 'international',
    950 + (random() * 180)::INT - 90,
    38000 + (random() * 6000)::INT - 3000,
    10.8 + (random() * 3)::NUMERIC(5,2) - 1.5,
    0.025 + (random() * 0.007)::NUMERIC(5,4),
    1.2 + (random() * 4)::NUMERIC(5,2) - 2,
    0.8 + (random() * 3)::NUMERIC(5,2) - 1.5,
    false
FROM generate_series(0, 29) AS n;

-- CreativeStudio: Declining but experiment running
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected)
SELECT
    'c8888888-8888-8888-8888-888888888888',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP', 'portfolio',
    CASE
        WHEN n < 7 THEN 380 + (random() * 80)::INT - 40  -- Recent: stable after experiment
        ELSE 420 - (n * 3) + (random() * 70)::INT - 35  -- Earlier: declining
    END,
    18000 - (n * 100) + (random() * 3000)::INT - 1500,
    14.2 + (n * 0.1)::NUMERIC(5,2) + (random() * 3)::NUMERIC(5,2) - 1.5,
    0.021 + (random() * 0.006)::NUMERIC(5,4),
    CASE WHEN n < 7 THEN 1.5 ELSE -2.5 END + (random() * 5)::NUMERIC(5,2) - 2.5,
    -1.8 + (random() * 4)::NUMERIC(5,2) - 2,
    CASE WHEN n >= 7 AND n < 14 THEN true ELSE false END
FROM generate_series(0, 29) AS n;

-- =============================================================================
-- COMPETITOR TRACKING FOR NEW CLIENTS
-- =============================================================================

INSERT INTO competitor_tracking (id, client_id, competitor_domain, competitor_name, tracking_keywords, is_active)
VALUES
    ('04444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444',
     'amazondiscounts.com', 'Amazon Discounts',
     ARRAY['retail deals', 'discount shopping', 'best online prices'], true),
    ('05555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555',
     'medtechsolutions.com', 'MedTech Solutions',
     ARRAY['healthcare software', 'telemedicine platform', 'HIPAA compliant software'], true);

-- =============================================================================
-- STRATEGIC RECOMMENDATIONS FOR NEW CLIENTS
-- =============================================================================

INSERT INTO strategic_recommendations (id, client_id, category, recommendation_text, rationale, expected_outcome, expected_outcome_timeframe, priority, evaluation_due_at)
VALUES
    ('24444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 'TECHNICAL',
     'Implement comprehensive 301 redirect map for all migrated URLs',
     'Migration caused 500+ 404 errors. Redirects are essential for traffic recovery.',
     'Recover 80% of lost traffic within 30 days',
     '30 days', 1, CURRENT_DATE + INTERVAL '30 days'),
    ('25555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555', 'CONTENT',
     'Expand telemedicine content hub with comparison guides',
     'Strong position 2-3 for key terms. Comparison content could capture featured snippets.',
     'Capture 3+ featured snippets in telemedicine category',
     '60 days', 2, CURRENT_DATE + INTERVAL '60 days');

-- =============================================================================
-- FUNCTION: Assign all clients to a user (for development/testing)
-- Call this after logging in: SELECT assign_all_clients_to_user(auth.uid());
-- =============================================================================

CREATE OR REPLACE FUNCTION assign_all_clients_to_user(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Insert assignments for all active clients not already assigned
    INSERT INTO user_client_assignments (user_id, client_id, role, assigned_at)
    SELECT p_user_id, c.id, 'PRIMARY', NOW()
    FROM clients c
    WHERE c.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM user_client_assignments uca
        WHERE uca.user_id = p_user_id
        AND uca.client_id = c.id
        AND uca.ended_at IS NULL
    );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_all_clients_to_user(UUID) TO authenticated;

-- =============================================================================
-- Update risk_scores on clients table to match health history
-- =============================================================================

UPDATE clients SET risk_score = 32 WHERE id = 'c4444444-4444-4444-4444-444444444444';
UPDATE clients SET risk_score = 85 WHERE id = 'c5555555-5555-5555-5555-555555555555';
UPDATE clients SET risk_score = 55 WHERE id = 'c6666666-6666-6666-6666-666666666666';
UPDATE clients SET risk_score = 72 WHERE id = 'c7777777-7777-7777-7777-777777777777';
UPDATE clients SET risk_score = 42 WHERE id = 'c8888888-8888-8888-8888-888888888888';

-- =============================================================================
-- USAGE NOTE:
-- After a user logs in for the first time, call this to assign all clients:
-- SELECT assign_all_clients_to_user(auth.uid());
--
-- Or in your application, you can call this via Supabase RPC:
-- await supabase.rpc('assign_all_clients_to_user', { p_user_id: user.id })
-- =============================================================================
