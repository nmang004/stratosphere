-- Stratosphere Seed Data
-- Development/testing data for all core tables

-- =============================================================================
-- SERVICE TIERS
-- =============================================================================

INSERT INTO service_tiers (id, tier_name, included_services, description, monthly_hours, priority_level)
VALUES
    ('a1b2c3d4-1111-1111-1111-111111111111', 'Starter',
     ARRAY['monthly_report', 'basic_audit', 'email_support'],
     'Essential SEO monitoring and monthly reporting', 10, 1),
    ('a1b2c3d4-2222-2222-2222-222222222222', 'Growth',
     ARRAY['monthly_report', 'weekly_checkin', 'full_audit', 'content_strategy', 'competitor_tracking', 'email_support', 'slack_support'],
     'Comprehensive SEO management with weekly touchpoints', 25, 2),
    ('a1b2c3d4-3333-3333-3333-333333333333', 'Enterprise',
     ARRAY['monthly_report', 'weekly_checkin', 'full_audit', 'content_strategy', 'competitor_tracking', 'technical_seo', 'link_building', 'executive_reports', 'dedicated_support', 'custom_dashboards', 'api_access'],
     'Full-service SEO partnership with dedicated support', 60, 3);

-- =============================================================================
-- CLIENTS
-- =============================================================================

INSERT INTO clients (id, name, domain, gsc_property_url, risk_score, industry, timezone, is_active, brand_voice_guidelines, notes)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'TechFlow Solutions', 'techflow.io', 'sc-domain:techflow.io', 78, 'SaaS', 'America/Los_Angeles', true,
     'Professional, innovative, technical but accessible. Avoid jargon. Focus on problem-solving.',
     'Fast-growing B2B SaaS. Main focus: organic growth in competitive keywords.'),
    ('c2222222-2222-2222-2222-222222222222', 'Coastal Living Magazine', 'coastalliving.com', 'sc-domain:coastalliving.com', 45, 'Publishing', 'America/New_York', true,
     'Warm, aspirational, lifestyle-focused. Use sensory language. Target affluent coastal homeowners.',
     'Seasonal traffic patterns. Q2-Q3 peak. Algorithm update in March impacted rankings.'),
    ('c3333333-3333-3333-3333-333333333333', 'MediCare Plus', 'medicareplus.health', 'sc-domain:medicareplus.health', 62, 'Healthcare', 'America/Chicago', true,
     'Trustworthy, empathetic, HIPAA-compliant language. No medical advice. Focus on accessibility.',
     'YMYL content requires extra care. Strong local SEO presence needed.');

-- =============================================================================
-- CLIENT ENTITLEMENTS
-- =============================================================================

INSERT INTO client_entitlements (client_id, tier_id, custom_exclusions, custom_inclusions)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'a1b2c3d4-3333-3333-3333-333333333333', '{}', ARRAY['priority_response']),
    ('c2222222-2222-2222-2222-222222222222', 'a1b2c3d4-2222-2222-2222-222222222222', ARRAY['link_building'], '{}'),
    ('c3333333-3333-3333-3333-333333333333', 'a1b2c3d4-2222-2222-2222-222222222222', '{}', ARRAY['hipaa_compliance_review']);

-- =============================================================================
-- CLIENT CONTRACTS
-- =============================================================================

INSERT INTO client_contracts (id, client_id, contract_start, contract_end, monthly_value, auto_renew, renewal_notice_days)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', '2024-01-01', '2025-12-31', 8500.00, true, 60),
    ('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', '2024-06-01', '2025-05-31', 4500.00, false, 30),
    ('d3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', '2024-03-15', '2025-03-14', 5200.00, true, 45);

-- =============================================================================
-- CALENDAR EVENTS
-- =============================================================================

INSERT INTO calendar_events (id, event_name, event_type, event_date, event_end_date, geo_scope, impact_category, expected_impact_pct, notes)
VALUES
    ('e1111111-1111-1111-1111-111111111111', 'Google Core Update March 2024', 'ALGORITHM_UPDATE', '2024-03-05', '2024-03-20', '{GLOBAL}', 'RANKING', -15.0, 'Significant ranking volatility expected. Focus on content quality.'),
    ('e2222222-2222-2222-2222-222222222222', 'Memorial Day Weekend', 'HOLIDAY', '2024-05-25', '2024-05-27', '{US}', 'TRAFFIC', -25.0, 'Expected traffic dip in B2B sectors, increase in travel/leisure.'),
    ('e3333333-3333-3333-3333-333333333333', 'Black Friday / Cyber Monday', 'HOLIDAY', '2024-11-29', '2024-12-02', '{US,UK,CA}', 'TRAFFIC', 40.0, 'Major traffic spike for e-commerce. Plan content in advance.'),
    ('e4444444-4444-4444-4444-444444444444', 'Google Spam Update November 2024', 'ALGORITHM_UPDATE', '2024-11-19', '2024-11-26', '{GLOBAL}', 'RANKING', -10.0, 'Targeting low-quality links and spam patterns.'),
    ('e5555555-5555-5555-5555-555555555555', 'Industry Conference: SEO Summit', 'INDUSTRY_EVENT', '2024-10-15', '2024-10-17', '{GLOBAL}', NULL, NULL, 'Major announcements expected. Monitor for news.');

-- =============================================================================
-- GSC AGGREGATES (30 days of sample data per client)
-- =============================================================================

-- Generate 30 days of data for TechFlow Solutions
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected)
SELECT
    'c1111111-1111-1111-1111-111111111111',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP',
    'blog',
    1200 + (random() * 400)::INT - 200 + (n * 5),  -- Trending up
    45000 + (random() * 10000)::INT - 5000,
    8.5 + (random() * 3)::NUMERIC(5,2) - 1.5,
    0.027 + (random() * 0.01)::NUMERIC(5,4),
    2.5 + (random() * 8)::NUMERIC(5,2) - 4,
    1.5 + (random() * 6)::NUMERIC(5,2) - 3,
    CASE WHEN random() < 0.1 THEN true ELSE false END
FROM generate_series(0, 29) AS n;

-- Generate 30 days for Coastal Living (seasonal decline)
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected)
SELECT
    'c2222222-2222-2222-2222-222222222222',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP',
    'articles',
    800 - (n * 8) + (random() * 200)::INT - 100,  -- Declining trend
    35000 - (n * 200) + (random() * 5000)::INT - 2500,
    12.3 + (random() * 4)::NUMERIC(5,2) - 2,
    0.022 + (random() * 0.008)::NUMERIC(5,4),
    -3.5 + (random() * 6)::NUMERIC(5,2) - 3,
    -2.0 + (random() * 5)::NUMERIC(5,2) - 2.5,
    CASE WHEN n > 20 AND random() < 0.3 THEN true ELSE false END
FROM generate_series(0, 29) AS n;

-- Generate 30 days for MediCare Plus (stable)
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected)
SELECT
    'c3333333-3333-3333-3333-333333333333',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP',
    'services',
    650 + (random() * 150)::INT - 75,  -- Stable
    28000 + (random() * 4000)::INT - 2000,
    15.7 + (random() * 3)::NUMERIC(5,2) - 1.5,
    0.023 + (random() * 0.006)::NUMERIC(5,4),
    0.5 + (random() * 4)::NUMERIC(5,2) - 2,
    0.3 + (random() * 3)::NUMERIC(5,2) - 1.5,
    false
FROM generate_series(0, 29) AS n;

-- =============================================================================
-- CLIENT HEALTH HISTORY (30 days)
-- =============================================================================

INSERT INTO client_health_history (client_id, recorded_date, health_score, traffic_trend_score, ops_velocity_score, sentiment_score, contributing_factors)
SELECT
    'c1111111-1111-1111-1111-111111111111',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    75 + (random() * 10)::INT - 2 + (n / 10),  -- Improving
    72 + (random() * 15)::NUMERIC(5,2) - 5,
    85 + (random() * 10)::NUMERIC(5,2) - 5,
    80 + (random() * 12)::NUMERIC(5,2) - 6,
    '{"traffic_weight": 0.4, "ops_weight": 0.3, "sentiment_weight": 0.3}'::JSONB
FROM generate_series(0, 29) AS n;

INSERT INTO client_health_history (client_id, recorded_date, health_score, traffic_trend_score, ops_velocity_score, sentiment_score, contributing_factors)
SELECT
    'c2222222-2222-2222-2222-222222222222',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    50 - (n / 5)::INT + (random() * 8)::INT - 4,  -- Declining
    40 + (random() * 15)::NUMERIC(5,2) - 7,
    55 + (random() * 20)::NUMERIC(5,2) - 10,
    52 + (random() * 15)::NUMERIC(5,2) - 7,
    '{"traffic_weight": 0.4, "ops_weight": 0.3, "sentiment_weight": 0.3}'::JSONB
FROM generate_series(0, 29) AS n;

INSERT INTO client_health_history (client_id, recorded_date, health_score, traffic_trend_score, ops_velocity_score, sentiment_score, contributing_factors)
SELECT
    'c3333333-3333-3333-3333-333333333333',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    60 + (random() * 8)::INT - 4,  -- Stable
    58 + (random() * 12)::NUMERIC(5,2) - 6,
    70 + (random() * 15)::NUMERIC(5,2) - 7,
    65 + (random() * 10)::NUMERIC(5,2) - 5,
    '{"traffic_weight": 0.4, "ops_weight": 0.3, "sentiment_weight": 0.3}'::JSONB
FROM generate_series(0, 29) AS n;

-- =============================================================================
-- ALERTS
-- =============================================================================

INSERT INTO alerts (id, client_id, severity, signal, context, recommended_action, alert_payload, is_dismissed, created_at)
VALUES
    -- TechFlow: Minor alerts
    ('f1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'INFO',
     'New competitor detected in top 10 for primary keywords',
     'CompetitorX.io appeared in positions 7-9 for 3 tracked keywords',
     'Review competitor content strategy and consider content updates',
     '{"keywords": ["saas pricing", "b2b software"], "competitor": "competitorx.io"}'::JSONB,
     false, NOW() - INTERVAL '2 hours'),

    -- Coastal Living: Critical alerts (declining)
    ('f2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'CRITICAL',
     'Traffic dropped 23% week-over-week',
     'Blog section traffic declined significantly following March core update',
     'Audit affected pages for content quality. Schedule client call.',
     '{"traffic_change": -23, "affected_section": "blog", "potential_cause": "core_update"}'::JSONB,
     false, NOW() - INTERVAL '1 day'),

    ('f3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'WARNING',
     'Core Web Vitals failing on 12 pages',
     'LCP above threshold on key landing pages',
     'Review image optimization and server response times',
     '{"failing_pages": 12, "primary_issue": "LCP", "avg_lcp": 4.2}'::JSONB,
     false, NOW() - INTERVAL '3 days'),

    ('f4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'WARNING',
     'No client touchpoint in 18 days',
     'Last interaction was an email on the monthly report',
     'Schedule a check-in call to discuss traffic decline',
     '{"last_touchpoint": "email", "days_since": 18}'::JSONB,
     false, NOW() - INTERVAL '6 hours'),

    -- MediCare Plus: Mixed alerts
    ('f5555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333', 'WARNING',
     'Contract renewal in 45 days',
     'Current contract expires March 14, 2025. Auto-renew is enabled.',
     'Prepare renewal discussion points and success metrics',
     '{"contract_end": "2025-03-14", "auto_renew": true, "days_remaining": 45}'::JSONB,
     false, NOW() - INTERVAL '12 hours'),

    ('f6666666-6666-6666-6666-666666666666', 'c3333333-3333-3333-3333-333333333333', 'INFO',
     'Local SEO opportunity identified',
     'GMB listing could rank for 5 additional keywords with optimization',
     'Review GMB categories and add relevant services',
     '{"opportunity_type": "local_seo", "potential_keywords": 5}'::JSONB,
     true, NOW() - INTERVAL '5 days');

-- =============================================================================
-- CLIENT TOUCHPOINTS
-- =============================================================================

INSERT INTO client_touchpoints (client_id, touchpoint_type, occurred_at, source, subject, summary, sentiment_score, metadata)
VALUES
    -- TechFlow: Recent engagement
    ('c1111111-1111-1111-1111-111111111111', 'MEETING', NOW() - INTERVAL '3 days', 'zoom', 'Weekly Strategy Sync',
     'Discussed Q1 content plan. Client excited about new keyword opportunities. Approved 5 new blog topics.',
     0.85, '{"duration_minutes": 45, "attendees": ["john@techflow.io", "strategist@agency.com"]}'::JSONB),
    ('c1111111-1111-1111-1111-111111111111', 'EMAIL_SENT', NOW() - INTERVAL '5 days', 'gmail', 'Monthly Report - December 2024',
     'Sent comprehensive monthly report highlighting 15% traffic growth.',
     NULL, '{"attachment": "report_dec_2024.pdf"}'::JSONB),
    ('c1111111-1111-1111-1111-111111111111', 'SLACK', NOW() - INTERVAL '1 day', 'slack', 'Quick question on new landing page',
     'Client asked about meta description best practices. Provided guidance.',
     0.70, '{"channel": "techflow-seo"}'::JSONB),

    -- Coastal Living: Sparse engagement
    ('c2222222-2222-2222-2222-222222222222', 'EMAIL_SENT', NOW() - INTERVAL '18 days', 'gmail', 'Monthly Report - November 2024',
     'Sent report with traffic decline analysis and recovery recommendations.',
     NULL, '{"attachment": "report_nov_2024.pdf"}'::JSONB),
    ('c2222222-2222-2222-2222-222222222222', 'EMAIL_RECEIVED', NOW() - INTERVAL '16 days', 'gmail', 'RE: Monthly Report',
     'Client acknowledged receipt. Expressed concern about traffic decline. Requested call.',
     0.35, '{"flagged": true}'::JSONB),

    -- MediCare Plus: Moderate engagement
    ('c3333333-3333-3333-3333-333333333333', 'MEETING', NOW() - INTERVAL '7 days', 'teams', 'Bi-weekly Check-in',
     'Reviewed local SEO progress. Client happy with GMB improvements. Discussed HIPAA compliance for new pages.',
     0.75, '{"duration_minutes": 30}'::JSONB),
    ('c3333333-3333-3333-3333-333333333333', 'TICKET_REPLY', NOW() - INTERVAL '4 days', 'zendesk', 'Schema markup question',
     'Answered client question about medical schema implementation.',
     0.65, '{"ticket_id": "ZD-4521"}'::JSONB);

-- =============================================================================
-- CHURN PREDICTION SCORES
-- =============================================================================

INSERT INTO churn_prediction_scores (client_id, prediction_date, churn_probability, model_version, contributing_factors, recommended_intervention)
VALUES
    ('c1111111-1111-1111-1111-111111111111', CURRENT_DATE, 0.12, 'v2.1',
     '{"engagement_score": 0.9, "health_trend": "positive", "contract_status": "stable"}'::JSONB,
     'Continue current engagement. Consider upsell opportunities.'),
    ('c2222222-2222-2222-2222-222222222222', CURRENT_DATE, 0.72, 'v2.1',
     '{"engagement_score": 0.3, "health_trend": "negative", "contract_status": "approaching_renewal", "traffic_decline": true}'::JSONB,
     'URGENT: Schedule executive call. Prepare recovery plan presentation. Consider temporary rate adjustment.'),
    ('c3333333-3333-3333-3333-333333333333', CURRENT_DATE, 0.38, 'v2.1',
     '{"engagement_score": 0.7, "health_trend": "stable", "contract_status": "approaching_renewal"}'::JSONB,
     'Prepare renewal discussion with success metrics. Highlight local SEO wins.');

-- =============================================================================
-- EXPERIMENTS
-- =============================================================================

INSERT INTO experiments (id, client_id, name, hypothesis, status, start_date, end_date, target_urls, control_urls, success_metric, minimum_detectable_effect)
VALUES
    ('b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
     'Title Tag Length Test',
     'Longer title tags (55-60 chars) will improve CTR compared to shorter ones (40-45 chars)',
     'RUNNING', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '14 days',
     ARRAY['https://techflow.io/features', 'https://techflow.io/pricing', 'https://techflow.io/integrations'],
     ARRAY['https://techflow.io/about', 'https://techflow.io/contact', 'https://techflow.io/blog'],
     'CTR improvement', 5.0),
    ('b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333',
     'FAQ Schema Implementation',
     'Adding FAQ schema to service pages will increase visibility and clicks from SERP features',
     'COMPLETED', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days',
     ARRAY['https://medicareplus.health/services/primary-care', 'https://medicareplus.health/services/telehealth'],
     ARRAY['https://medicareplus.health/services/urgent-care', 'https://medicareplus.health/services/mental-health'],
     'Clicks from rich results', 10.0);

-- =============================================================================
-- EXPERIMENT SNAPSHOTS
-- =============================================================================

INSERT INTO experiment_snapshots (experiment_id, snapshot_type, recorded_at, frozen_metrics, notes)
VALUES
    ('b1111111-1111-1111-1111-111111111111', 'START', CURRENT_DATE - INTERVAL '14 days',
     '{"target_ctr": 0.032, "control_ctr": 0.031, "target_impressions": 15000, "control_impressions": 14500}'::JSONB,
     'Baseline captured before title changes'),
    ('b2222222-2222-2222-2222-222222222222', 'START', CURRENT_DATE - INTERVAL '60 days',
     '{"target_clicks": 450, "control_clicks": 420, "rich_result_appearances": 0}'::JSONB,
     'Pre-schema baseline'),
    ('b2222222-2222-2222-2222-222222222222', 'END', CURRENT_DATE - INTERVAL '30 days',
     '{"target_clicks": 580, "control_clicks": 440, "rich_result_appearances": 850, "ctr_improvement": 28.9}'::JSONB,
     'Significant improvement. Schema validated as success.');

-- =============================================================================
-- COMPETITOR TRACKING
-- =============================================================================

INSERT INTO competitor_tracking (id, client_id, competitor_domain, competitor_name, tracking_keywords, is_active)
VALUES
    ('01111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
     'rivaltech.com', 'RivalTech',
     ARRAY['saas pricing calculator', 'b2b software comparison', 'enterprise software solutions'], true),
    ('02222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111',
     'softwarebuddy.io', 'Software Buddy',
     ARRAY['software reviews', 'tech stack recommendations'], true),
    ('03333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222',
     'beachhouse.com', 'Beach House Magazine',
     ARRAY['coastal home decor', 'beach living tips', 'oceanfront properties'], true);

-- =============================================================================
-- DEPLOYMENT EVENTS
-- =============================================================================

INSERT INTO deployment_events (id, client_id, deployed_at, deployment_type, affected_urls, description, source)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '7 days', 'CONTENT',
     ARRAY['https://techflow.io/blog/new-post-1', 'https://techflow.io/blog/new-post-2'],
     'Published 2 new blog posts on software integration topics', 'cms'),
    ('12222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222',
     NOW() - INTERVAL '25 days', 'CODE',
     ARRAY['https://coastalliving.com/*'],
     'Site-wide redesign launch. New template and navigation structure.', 'github'),
    ('13333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
     NOW() - INTERVAL '10 days', 'REDIRECT',
     ARRAY['https://medicareplus.health/old-services/*'],
     'Consolidated old service pages into new structure. 15 redirects implemented.', 'manual');

-- =============================================================================
-- STRATEGIC RECOMMENDATIONS
-- =============================================================================

INSERT INTO strategic_recommendations (id, client_id, category, recommendation_text, rationale, expected_outcome, expected_outcome_timeframe, priority, evaluation_due_at)
VALUES
    ('21111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'CONTENT',
     'Create comparison pages for top 3 competitors',
     'Competitor comparison queries have high commercial intent and TechFlow is not ranking for any.',
     '20% increase in bottom-funnel organic traffic',
     '60 days', 1, CURRENT_DATE + INTERVAL '60 days'),
    ('22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'TECHNICAL',
     'Implement aggressive image optimization and lazy loading',
     'Core Web Vitals are failing on 12 key pages. LCP is primary issue.',
     'Pass CWV on all key pages, potential ranking recovery',
     '30 days', 1, CURRENT_DATE + INTERVAL '30 days'),
    ('23333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'CONTENT',
     'Develop local landing pages for 5 new service areas',
     'Expansion into neighboring cities presents local SEO opportunity.',
     '15 new local keyword rankings in top 10',
     '90 days', 2, CURRENT_DATE + INTERVAL '90 days');

-- =============================================================================
-- API QUOTA TRACKING
-- =============================================================================

INSERT INTO api_quota_tracking (client_id, api_type, quota_date, allocated_quota, used_quota, reserved_quota)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'GSC', CURRENT_DATE, 25000, 12450, 5000),
    ('c2222222-2222-2222-2222-222222222222', 'GSC', CURRENT_DATE, 25000, 8200, 2000),
    ('c3333333-3333-3333-3333-333333333333', 'GSC', CURRENT_DATE, 25000, 5600, 1500),
    (NULL, 'GEMINI', CURRENT_DATE, 1000000, 45000, 100000);

-- =============================================================================
-- KNOWLEDGE BASE (Sample entries)
-- =============================================================================

INSERT INTO knowledge_base (id, client_id, content_chunk, source_type, source_url, metadata, version)
VALUES
    ('31111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
     'TechFlow primary value proposition: All-in-one B2B SaaS platform for workflow automation. Target audience: Mid-market companies (100-1000 employees) in tech, finance, and healthcare sectors.',
     'brand_guidelines', NULL,
     '{"last_updated": "2024-01-15", "category": "positioning"}'::JSONB, 1),
    ('32222222-2222-2222-2222-222222222222', NULL,
     'Google March 2024 Core Update: Focus on helpful content and user experience. Sites with thin content or poor E-E-A-T signals may see ranking declines. Recovery requires content quality improvements.',
     'industry_update', 'https://developers.google.com/search/blog/2024/03/march-2024-core-update',
     '{"event_date": "2024-03-05", "category": "algorithm_update"}'::JSONB, 1),
    ('33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
     'MediCare Plus compliance requirements: All health content must include disclaimers. No direct medical advice. Schema markup must follow medical entity guidelines. HIPAA considerations for any patient-related content.',
     'compliance', NULL,
     '{"category": "legal", "requires_review": true}'::JSONB, 1);

-- =============================================================================
-- Update client risk scores to match health history
-- =============================================================================

UPDATE clients SET risk_score = 78 WHERE id = 'c1111111-1111-1111-1111-111111111111';
UPDATE clients SET risk_score = 45 WHERE id = 'c2222222-2222-2222-2222-222222222222';
UPDATE clients SET risk_score = 62 WHERE id = 'c3333333-3333-3333-3333-333333333333';
