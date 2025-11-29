-- Stratosphere GSC Extended Seed Data
-- Extended GSC data for demo purposes (Phase 5)
-- Includes 90 days of realistic data with anomalies that correlate with calendar events

-- =============================================================================
-- ADDITIONAL CALENDAR EVENTS (for anomaly correlation)
-- =============================================================================

INSERT INTO calendar_events (id, event_name, event_type, event_date, event_end_date, geo_scope, impact_category, expected_impact_pct, notes)
VALUES
    -- Recent algorithm updates
    ('e6666666-6666-6666-6666-666666666666', 'Google November 2024 Core Update', 'ALGORITHM_UPDATE', '2024-11-08', '2024-11-15', '{GLOBAL}', 'RANKING', -12.0, 'Focus on content quality and user experience. Similar patterns to March 2024 update.'),
    ('e7777777-7777-7777-7777-777777777777', 'Google Reviews Update', 'ALGORITHM_UPDATE', '2024-11-21', '2024-11-25', '{GLOBAL}', 'RANKING', -8.0, 'Targeting fake reviews and review spam.'),

    -- Holidays and seasonal events
    ('e8888888-8888-8888-8888-888888888888', 'Thanksgiving', 'HOLIDAY', '2024-11-28', '2024-11-28', '{US}', 'TRAFFIC', -30.0, 'Major traffic dip expected for B2B. Increase for retail.'),
    ('e9999999-9999-9999-9999-999999999999', 'Christmas Eve/Day', 'HOLIDAY', '2024-12-24', '2024-12-25', '{US,UK,CA,AU}', 'TRAFFIC', -40.0, 'Significant traffic dip across most sectors.'),
    ('eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'New Year Holiday', 'HOLIDAY', '2024-12-31', '2025-01-01', '{GLOBAL}', 'TRAFFIC', -35.0, 'Global traffic dip during holiday period.'),

    -- Industry events
    ('ebbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Healthcare Open Enrollment End', 'INDUSTRY_EVENT', '2024-12-15', '2024-12-15', '{US}', 'TRAFFIC', 25.0, 'Traffic spike for healthcare related searches.')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- EXTENDED GSC AGGREGATES (90 days per client)
-- =============================================================================

-- Delete existing GSC aggregates to replace with more comprehensive data
DELETE FROM gsc_aggregates WHERE client_id IN (
    'c1111111-1111-1111-1111-111111111111',
    'c2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333'
);

-- TechFlow Solutions: Growing trend with algorithm update impact
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected, anomaly_score)
SELECT
    'c1111111-1111-1111-1111-111111111111',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP',
    'all',
    -- Base clicks with growth trend, weekend dips, and algorithm update impact
    CASE
        WHEN n BETWEEN 45 AND 52 THEN -- Algorithm update period (mid-November)
            800 + (random() * 200)::INT - 100
        WHEN EXTRACT(DOW FROM CURRENT_DATE - (n || ' days')::INTERVAL) IN (0, 6) THEN -- Weekend
            (1000 + (90-n) * 8 + (random() * 200)::INT - 100) * 0.7
        ELSE
            1000 + (90-n) * 8 + (random() * 200)::INT - 100
    END,
    -- Impressions
    CASE
        WHEN n BETWEEN 45 AND 52 THEN
            35000 + (random() * 8000)::INT - 4000
        ELSE
            40000 + (90-n) * 50 + (random() * 10000)::INT - 5000
    END,
    -- Position (improving over time)
    CASE
        WHEN n BETWEEN 45 AND 52 THEN 10.5 + (random() * 2)::NUMERIC(5,2)
        ELSE 9.0 - (90-n) * 0.02 + (random() * 2)::NUMERIC(5,2) - 1
    END,
    -- CTR
    0.025 + (random() * 0.01)::NUMERIC(5,4),
    -- Clicks delta
    CASE
        WHEN n BETWEEN 45 AND 52 THEN -15 + (random() * 10)::NUMERIC(5,2)
        ELSE 3.0 + (random() * 8)::NUMERIC(5,2) - 4
    END,
    -- Impressions delta
    CASE
        WHEN n BETWEEN 45 AND 52 THEN -10 + (random() * 8)::NUMERIC(5,2)
        ELSE 2.0 + (random() * 6)::NUMERIC(5,2) - 3
    END,
    -- Anomaly detected
    CASE
        WHEN n BETWEEN 45 AND 52 THEN true
        WHEN random() < 0.05 THEN true
        ELSE false
    END,
    -- Anomaly score
    CASE
        WHEN n BETWEEN 45 AND 52 THEN 0.75 + (random() * 0.2)::NUMERIC(5,2)
        WHEN random() < 0.05 THEN 0.5 + (random() * 0.3)::NUMERIC(5,2)
        ELSE NULL
    END
FROM generate_series(0, 89) AS n;

-- Coastal Living Magazine: Seasonal decline with holiday spike
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected, anomaly_score)
SELECT
    'c2222222-2222-2222-2222-222222222222',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP',
    'all',
    -- Declining trend with Black Friday spike
    CASE
        WHEN n BETWEEN 30 AND 34 THEN -- Black Friday period
            1200 + (random() * 400)::INT - 200
        WHEN n > 60 THEN -- Earlier period (summer)
            900 + (random() * 200)::INT - 100
        ELSE -- Recent decline
            700 - n * 3 + (random() * 150)::INT - 75
    END,
    CASE
        WHEN n BETWEEN 30 AND 34 THEN
            50000 + (random() * 15000)::INT - 7500
        WHEN n > 60 THEN
            42000 + (random() * 8000)::INT - 4000
        ELSE
            32000 - n * 100 + (random() * 6000)::INT - 3000
    END,
    12.5 + n * 0.03 + (random() * 3)::NUMERIC(5,2) - 1.5,
    0.020 + (random() * 0.008)::NUMERIC(5,4),
    CASE
        WHEN n BETWEEN 30 AND 34 THEN 25 + (random() * 15)::NUMERIC(5,2)
        ELSE -4.0 + (random() * 8)::NUMERIC(5,2) - 4
    END,
    CASE
        WHEN n BETWEEN 30 AND 34 THEN 20 + (random() * 12)::NUMERIC(5,2)
        ELSE -3.0 + (random() * 6)::NUMERIC(5,2) - 3
    END,
    CASE
        WHEN n BETWEEN 30 AND 34 THEN true
        WHEN n < 20 AND random() < 0.15 THEN true
        ELSE false
    END,
    CASE
        WHEN n BETWEEN 30 AND 34 THEN 0.8 + (random() * 0.15)::NUMERIC(5,2)
        WHEN n < 20 AND random() < 0.15 THEN 0.6 + (random() * 0.25)::NUMERIC(5,2)
        ELSE NULL
    END
FROM generate_series(0, 89) AS n;

-- MediCare Plus: Stable with healthcare enrollment spike
INSERT INTO gsc_aggregates (client_id, aggregation_date, segment_type, segment_value, total_clicks, total_impressions, avg_position, avg_ctr, clicks_delta_pct, impressions_delta_pct, anomaly_detected, anomaly_score)
SELECT
    'c3333333-3333-3333-3333-333333333333',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    'PAGE_GROUP',
    'all',
    -- Stable with enrollment period spike
    CASE
        WHEN n BETWEEN 14 AND 20 THEN -- Open enrollment end period
            850 + (random() * 300)::INT - 150
        ELSE
            600 + (random() * 150)::INT - 75
    END,
    CASE
        WHEN n BETWEEN 14 AND 20 THEN
            38000 + (random() * 10000)::INT - 5000
        ELSE
            28000 + (random() * 4000)::INT - 2000
    END,
    15.5 + (random() * 3)::NUMERIC(5,2) - 1.5,
    0.022 + (random() * 0.006)::NUMERIC(5,4),
    CASE
        WHEN n BETWEEN 14 AND 20 THEN 15 + (random() * 12)::NUMERIC(5,2)
        ELSE 0.5 + (random() * 4)::NUMERIC(5,2) - 2
    END,
    CASE
        WHEN n BETWEEN 14 AND 20 THEN 12 + (random() * 10)::NUMERIC(5,2)
        ELSE 0.3 + (random() * 3)::NUMERIC(5,2) - 1.5
    END,
    CASE
        WHEN n BETWEEN 14 AND 20 THEN true
        ELSE false
    END,
    CASE
        WHEN n BETWEEN 14 AND 20 THEN 0.7 + (random() * 0.2)::NUMERIC(5,2)
        ELSE NULL
    END
FROM generate_series(0, 89) AS n;

-- =============================================================================
-- GSC CACHE LOGS (Pre-populated for demo)
-- =============================================================================

-- Add cache entries for each client
INSERT INTO gsc_cache_logs (client_id, endpoint_signature, data_payload, row_count, created_at, expires_at)
SELECT
    client_id,
    'timeseries_28d_' || ENCODE(SHA256(client_id::text::bytea), 'hex')::text,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'date', aggregation_date,
                'clicks', total_clicks,
                'impressions', total_impressions,
                'ctr', avg_ctr,
                'position', avg_position
            ) ORDER BY aggregation_date
        )
        FROM gsc_aggregates g2
        WHERE g2.client_id = g1.client_id
        AND g2.aggregation_date >= CURRENT_DATE - INTERVAL '28 days'
    ),
    28,
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '22 hours'
FROM (SELECT DISTINCT client_id FROM gsc_aggregates) g1
ON CONFLICT (client_id, endpoint_signature) DO UPDATE SET
    data_payload = EXCLUDED.data_payload,
    created_at = EXCLUDED.created_at,
    expires_at = EXCLUDED.expires_at;

-- =============================================================================
-- UPDATE API QUOTA TRACKING
-- =============================================================================

-- Ensure quota entries exist for today
INSERT INTO api_quota_tracking (client_id, api_type, quota_date, allocated_quota, used_quota, reserved_quota)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'GSC', CURRENT_DATE, 25000, 150, 5000),
    ('c2222222-2222-2222-2222-222222222222', 'GSC', CURRENT_DATE, 25000, 120, 2000),
    ('c3333333-3333-3333-3333-333333333333', 'GSC', CURRENT_DATE, 25000, 80, 1500)
ON CONFLICT (client_id, api_type, quota_date) DO UPDATE SET
    used_quota = EXCLUDED.used_quota;

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- This migration creates:
-- 1. Additional calendar events for anomaly correlation
-- 2. 90 days of GSC aggregate data per client with:
--    - TechFlow: Growth trend with mid-November algorithm impact
--    - Coastal Living: Seasonal decline with Black Friday spike
--    - MediCare Plus: Stable with healthcare enrollment spike
-- 3. Pre-populated cache entries for demo
-- 4. Updated quota tracking
--
-- The data is designed to demonstrate:
-- - Cache-first strategy (data already cached)
-- - Anomaly detection with temporal context
-- - Various traffic patterns (growth, decline, stable)
-- - Calendar event correlation
