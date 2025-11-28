# Stratosphere
## "God Mode" Edition
### Software Requirements Specification

**Version 6.0** | Architecture Hardened & AI-Augmented

| Field | Value |
|-------|-------|
| Document Status | APPROVED |
| Approval Authority | CPO & Principal Architect |
| Technology Stack | Next.js 14 (App Router), Supabase, Vercel AI SDK, Google Gemini |
| Last Updated | November 28, 2025 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture & Core Logic](#2-system-architecture--core-logic)
3. [Functional Modules](#3-functional-modules)
4. [Strategic Expansion Features](#4-strategic-expansion-features)
5. [Database Schema Requirements](#5-database-schema-requirements)
6. [AI System Instructions](#6-ai-system-instructions)
7. [Implementation Priority Matrix](#7-implementation-priority-matrix)

---

## 1. Executive Summary

Stratosphere is a mission-critical application designed to transform how SEO Strategists manage high-stakes client relationships, perform forensic audits, and execute operational workflows. This specification defines a "God Mode" dashboard that automates decision-making, enforces operational standards, and deploys AI agents to perform work that typically requires hours of human effort.

### 1.1 Core Philosophy

**The Hybrid Logic Engine:** "Code does the Math; AI does the Reasoning."

All quantitative analysis must be performed by Supabase Edge Functions or TypeScript utilities before being passed to the LLM. The AI System Prompt receives pre-calculated deltas, not raw data arrays.

### 1.2 Version 6.0 Enhancements

This version introduces critical architectural improvements identified through gap analysis:

- Predictive churn detection with 30-60 day advance warning
- Automated competitive intelligence monitoring
- Client-facing transparency portal
- Deployment-to-performance regression correlation
- Strategic recommendation memory with outcome tracking
- **[NEW]** Minimum data threshold enforcement (14+ days required)
- **[NEW]** Cache freshness transparency with graduated warnings
- **[NEW]** Rule-based churn fallback when ML unavailable
- **[NEW]** Statistical rigor requirements for experiments
- **[NEW]** Enhanced empty state handling

---

## 2. System Architecture & Core Logic

**Objective:** Move from synchronous "Request-Response" to asynchronous "Event-Driven" architecture to handle GSC data volume and prevent AI timeout.

### 2.1 The "Shadow Sync" Layer (Job Queue) `[NOT STARTED]`

**Technology:** Inngest (hosted on Vercel)

**Function:**
- 04:00 AM UTC: Trigger `fetch_gsc_daily` for all active clients
- Stagger API calls with exponential backoff to stay within Google's QPM
- Save raw JSON responses to `gsc_cache_logs` and update `client_health_metrics`
- Pre-generate "Morning Briefing" before user login

#### 2.1.1 Rate Limit Handling Pattern

All GSC API calls must implement circuit breaker pattern with exponential backoff:

```
Retry Config: {
  retries: 5,
  backoff: {
    type: 'exponential',
    minDelay: 60000ms,
    maxDelay: 3600000ms
  }
}
```

- **Quota Check:** Before each call, verify quota > 10 remaining; if not, sleep 5 minutes
- **Stagger:** 2-second delay between client fetches

### 2.2 The RAG Context Core `[COMPLETE]`

**Technology:** Supabase pgvector + Gemini Embeddings (via Vercel AI SDK)

**Data Sources:** Past Ticket Solutions, Strategy Docs, Client Brand Guidelines, Strategic Recommendations History

**Flow:**
1. User Query → Embed Query
2. Similarity Search (Supabase pgvector with HNSW index)
3. Inject Top 3 Chunks into System Prompt (with confidence scores)
4. AI Response with source attribution

#### 2.2.1 RAG Quality Controls

To prevent retrieval poisoning from stale or outdated content:
- All `knowledge_base` entries require version tracking and expiration dates
- Similarity scores below 0.75 must be flagged with low-confidence warnings
- **[CRITICAL]** Client-specific content must be scoped to prevent cross-contamination
- **[NEW]** Filter by `client_id` BEFORE similarity search, not after

### 2.3 Tiered Data Summarization `[COMPLETE]`

For clients with 50,000+ pages, implement three-tier data processing:

| Layer | Description | Table |
|-------|-------------|-------|
| Raw Layer | Full GSC response data | `gsc_cache_logs` |
| Aggregate Layer | Pre-computed rollups by segment | `gsc_aggregates` |
| Alert Layer | Only anomalies exceeding threshold passed to AI | `alerts` |

---

## 3. Functional Modules

### 3.1 Module A: The Intelligence Dashboard (Command Center)

#### FR-A1: The "Morning Briefing" (Pre-Computed) `[NOT STARTED]`

**Input:** Data from the "Shadow Sync" layer

**Output:** A structured list of anomalies with severity classification

**UI Component:** "The Triage Stack" - A card-based interface where the Strategist swipes right to "Auto-Fix" (create ticket) or left to "Dismiss" an alert.

**Alert Format Required:**
```
[SEVERITY: Critical/Warning/Info] → [CLIENT] → [SIGNAL] → [CONTEXT] → [RECOMMENDED ACTION]
```

**[NEW] Critical Alert Friction:** For CRITICAL severity alerts, require:
- 3-second hold before dismiss
- Typed confirmation ("DISMISS")
- Mandatory `dismissal_reason` selection

#### FR-A2: The "Client Pulse" Sentinel `[NOT STARTED]`

**Logic:** A composite Health Score (0-100) calculated daily via Edge Function

**Formula:** `(0.4 × Traffic_Trend) + (0.3 × Ops_Velocity) + (0.3 × Sentiment_Score)`

| Component | Description |
|-----------|-------------|
| Traffic_Trend | YoY and MoM performance weighted |
| Ops_Velocity | Checks `client_touchpoints` table. If last contact > 14 days, apply score penalty |
| Sentiment_Score | NLP analysis of recent communications |

**Action:** If Score < 40, UI flashes red and prompts: "Draft Retention Email?"

#### FR-A3: Dismissed Alerts Audit Trail `[COMPLETE]`

All dismissed alerts must be logged to `alert_dismissals` table with:
- Dismissal reason (required field)
- User who dismissed
- Original alert payload for retrospective analysis
- Auto-resurface mechanism if conditions worsen within 7 days

### 3.2 Module B: Operations & Triage (The "Lawyer")

#### FR-B1: The AM Context Engine (RAG-Enabled) `[NOT STARTED]`

**Enhancement:** Before drafting a reply, the system retrieves the `client_entitlements` record (normalized service tier, not plain text).

**The "Lawyer" Guardrail:** If the draft promises work outside the `included_services` array, the AI interrupts:

```
[SCOPE WARNING: '{work_type}' is outside contracted services. Client tier: {tier_name}]
```

#### FR-B2: The "Say No" Negotiator `[NOT STARTED]`

**Trigger:** Ticket Request Due Date < 24 Hours

**Output:** The system disables the "Accept" button for 5 seconds (friction) and presents three AI-generated negotiation scripts:

| Style | Description |
|-------|-------------|
| Soft | Acknowledge urgency, propose 48-hour alternative |
| Firm | State capacity constraints, offer priority queue for next week |
| Hard | Decline with scope/contract reference |

### 3.3 Module C: Technical & Forensics

#### FR-C1: GSC "Deep Dive" Wrapper `[NOT STARTED]`

**Requirement:** Cache-First Strategy

**Logic:**
1. Check `gsc_cache_logs` for valid data (< 24h old via `expires_at`)
2. If exists and valid, use cached data
3. If not, trigger API call + Toast Notification ("Fetching fresh data from Google...")
4. Display data freshness timestamp in all outputs

**[NEW] Cache Freshness Warnings:**
- If `cache_age > 12h`: prepend "[Data is {age}h old. Consider refreshing for critical decisions.]"
- If `cache_age > 20h`: append "[Warning: Data approaching expiration. Refresh recommended.]"

#### FR-C2: The "SERP-Shapeshifter" Simulator `[NOT STARTED]`

**Action:** User inputs a target keyword

**Process:**
1. Fetch live Google SERP results (via Serper.dev or similar)
2. AI compares Client Title/Meta vs. Top 3 Competitors
3. Output: "Psychological Injection" - AI rewrites client's metadata to counter competitor value propositions

**Example:** Competitor claims "Fast Shipping" → Suggest "Same-Day Shipping"

#### FR-C3: Temporal Context Engine `[NOT STARTED]`

When analyzing traffic anomalies, the system must:
1. Query `calendar_events` table for overlapping dates and matching `geo_scope`
2. If match found, label anomaly as "Seasonal/Event-Driven" before technical investigation
3. **Required AI phrase:** "This coincides with {event_name}. Recommend comparing YoY rather than WoW."

### 3.4 Module D: Experiments & Knowledge

#### FR-D1: Deterministic Snapshotting `[NOT STARTED]`

**Trigger:** When an Experiment status moves to "Running"

**Action:** Immediate hard-copy of current metrics to `experiment_snapshots` table

**Constraint:** Do not rely on live API queries to look back at "Start Date" data

**Validation Required:** AI must state "Baseline captured on {snapshot.recorded_at}. Current comparison is valid." before discussing results

**Guard:** If no START snapshot exists, AI must warn: "Baseline Missing: Cannot validate results."

#### FR-D2: The "Win" Generator `[NOT STARTED]`

**Enhancement:** Generates a JSON payload for Slack Block Kit ensuring visual structure:
- Green checkmarks for wins
- Red indicators for blockers
- Metric cards with delta indicators

**Guard:** Do not generate "Win" reports for experiments where `experiment_duration < 21 days`

---

## 4. Strategic Expansion Features

The following features transform Stratosphere from a tool into an indispensable platform, providing proactive intelligence rather than reactive reporting.

### 4.1 Predictive Churn Radar `[NOT STARTED]`

**Problem:** Current Health Score is reactive. By the time it drops below 40, the client is already disengaged.

**Solution:** ML model trained on historical churn signals predicting risk 30-60 days in advance.

**Signals Tracked:**
- Email response latency trending upward
- Meeting cancellation frequency
- Ticket volume decline (stopped asking for things)
- Invoice payment delays
- Sentiment shift in communications (NLP analysis)

**AI Behavior:** When `churn_probability > 0.65`, prepend all responses with:
```
"[RETENTION ALERT] This client shows elevated churn risk. Consider..."
```
And suggest proactive retention action before addressing query.

**[NEW] Fallback Logic:** If ML model unavailable:
- Use rule-based scoring: HIGH if (`last_touchpoint > 21 days` AND `health_score < 50`)
- Label as "[Rule-Based Risk Assessment]" rather than "Prediction"
- Never state ML confidence when using rule-based fallback

### 4.2 Competitive Intelligence Autopilot `[NOT STARTED]`

**Problem:** SERP-Shapeshifter is manual and keyword-by-keyword.

**Solution:** Continuous competitive monitoring with automatic strategy recommendations.

**Mechanics:**
- Weekly crawl of top 10 competitors per client (defined in `competitor_tracking`)
- Track new content, backlink acquisitions, ranking movements
- AI synthesizes "Competitive Briefing" with actionable counter-moves
- Store detected changes in `competitor_changes` with AI-generated strategic response

### 4.3 Client Transparency Portal `[NOT STARTED]`

**Problem:** Clients constantly ask "what are you doing for me?" Strategists spend hours on status updates.

**Solution:** Read-only client dashboard auto-generated from internal data.

**Key Views:**
- Active experiments with progress indicators
- Completed tickets this month (filtered via `client_visible` flag)
- Traffic/ranking trends with AI-generated plain-English summaries
- Upcoming scheduled work

**Auto-Generation:** Weekly/monthly summaries stored in `client_portal_summaries`

**Implementation:** Same Next.js app with `/portal/[clientSlug]` routes (no separate deployment)

### 4.4 Regression Defender `[NOT STARTED]`

**Problem:** Changes get deployed, traffic drops two weeks later, and no one connects the dots until crisis.

**Solution:** Automatic correlation between deployment events and performance changes.

**Mechanics:**
- Integrate with client's deployment tracking (GitHub webhooks, Vercel, or manual logging)
- When traffic anomaly detected, check `deployment_events` for preceding 7-14 days
- Generate "Probable Cause" report linking specific changes to specific drops
- Store correlations with confidence scores in `anomaly_correlations`

### 4.5 Strategic Copilot Memory `[NOT STARTED]`

**Problem:** AI doesn't remember past recommendations or learn from outcomes.

**Solution:** Long-term memory for strategic decisions with outcome tracking.

**Mechanics:**
- Log all recommendations to `strategic_recommendations` with expected outcome
- When outcome period ends, evaluate actual vs. expected
- Feed successful patterns back into RAG context
- Flag repeat failures for human review
- Embed recommendations for similarity search on future scenarios

### 4.6 Killer Feature Proposals (From Addendum)

#### 4.6.1 The "What Changed?" Time Machine `[NOT STARTED]`

**Problem:** Client asks: "What happened to our traffic on October 15th?" Strategist spends 2 hours manually correlating GSC data, deployments, algorithm updates, and competitor movements.

**Solution:** Interactive timeline that automatically correlates all event sources around any selected date.

**Value:** 2-hour investigation → 30-second query. Defensible answers with citation links.

**Mechanics:**
- User clicks any date on traffic chart → System queries ±7 day window across all event tables
- AI generates narrative: "On Oct 15, you deployed redirect changes (deployment #47). Two days later, Googlebot increased crawl rate 340%. By Oct 20, affected pages recovered 89% of lost traffic."
- Exportable PDF with full citation trail for client presentation

#### 4.6.2 The "Prove It" Experiment Validator `[NOT STARTED]`

**Problem:** SEO experiments lack statistical rigor. "Traffic went up" isn't proof of causation.

**Solution:** Automated statistical significance testing with control group comparison.

**Value:** Defensible results that withstand client scrutiny. Build reputation for rigor.

**Mechanics:**
- When experiment created, AI suggests control group pages with similar baseline metrics
- Edge Function runs daily t-test comparing treatment vs. control
- Minimum sample size calculator prevents premature conclusions
- Results displayed with confidence intervals, not just percentages

#### 4.6.3 The "Executive Autopilot" Report Generator `[NOT STARTED]`

**Problem:** Monthly reporting takes 4-6 hours per client. It's tedious and error-prone.

**Solution:** AI-generated executive reports with brand-compliant formatting, auto-populated from system data.

**Value:** 20 clients × 5 hours = 100 hours/month → 10 hours for review/approval.

**Mechanics:**
- Template system with client-specific `brand_voice_guidelines` applied
- Auto-pull: traffic trends, completed tickets, experiment results, next month priorities
- AI generates narrative sections; strategist reviews and approves
- One-click export to PDF with charts or direct email via SendGrid integration

#### 4.6.4 The "Contract Guardian" Renewal Tracker `[NOT STARTED]`

**Problem:** Contracts auto-renew or expire without proactive engagement. Upsell opportunities missed.

**Solution:** Contract lifecycle management with AI-generated renewal playbooks.

**Value:** Higher retention, larger contract values, predictable revenue forecasting.

**Mechanics:**
- New table: `client_contracts` with `start_date`, `end_date`, `auto_renew`, `value`, `terms`
- 90-day alert: Generate "Renewal Prep" document with ROI summary since start
- 60-day alert: AI proposes upsell based on delivered work vs. contracted scope
- 30-day alert: Draft renewal conversation script tailored to client's health score

#### 4.6.5 The "Knowledge Autopsy" Learning Loop `[NOT STARTED]`

**Problem:** Strategic recommendations are made, but outcomes are never tracked. Organization doesn't learn.

**Solution:** Closed-loop system that tracks recommendation → implementation → outcome → learning.

**Value:** AI gets smarter over time. Bad recommendations flagged and corrected.

**Mechanics:**
- Every AI recommendation logs to `strategic_recommendations` with `expected_outcome`
- When `evaluation_due_at` arrives, system prompts strategist to record `actual_outcome`
- AI generates learnings comparison and updates `knowledge_base` with outcome data
- "Strategy Effectiveness" dashboard shows win/loss rates by recommendation category

---

## 5. Database Schema Requirements (Supabase)

### 5.1 Extensions Required `[COMPLETE]`

```sql
CREATE EXTENSION IF NOT EXISTS vector;    -- For RAG embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- For fuzzy text search
```

### 5.2 Core Tables

#### clients (Enhanced) `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, auto-generated |
| name | text | Client name |
| risk_score | int | 0-100, calculated daily |
| brand_voice_guidelines | text | Client tone/style preferences |
| created_at | timestamptz | Record creation time |
| updated_at | timestamptz | Last update time |

#### user_profiles `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | References auth.users(id) |
| display_name | text | User's name for UI display |
| account_manager_style | enum | SUCCINCT, COLLABORATIVE, EXECUTIVE |
| default_view | enum | TRIAGE, CALENDAR, CLIENT_LIST |
| notification_preferences | jsonb | { email: true, slack: true, critical_only: false } |

#### user_client_assignments `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Primary key |
| user_id | uuid FK | References user_profiles(id) |
| client_id | uuid FK | References clients(id) |
| role | enum | PRIMARY, BACKUP, OBSERVER, EXECUTIVE |
| assigned_at | timestamptz | When assignment began |
| ended_at | timestamptz | NULL if currently active |

#### gsc_cache_logs `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients(id) |
| endpoint_signature | text | Hash of query params for lookup |
| data_payload | jsonb | Full GSC API response |
| created_at | timestamptz | When cached |
| expires_at | timestamptz | Usually created_at + 24h |

#### gsc_aggregates `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients(id) |
| aggregation_date | date NOT NULL | Date of aggregation |
| segment_type | enum | SUBDOMAIN, CONTENT_TYPE, PAGE_GROUP |
| segment_value | text | The segment identifier |
| total_clicks | int | Sum of clicks |
| total_impressions | int | Sum of impressions |
| avg_position | numeric(5,2) | Weighted average position |
| clicks_delta_pct | numeric(5,2) | % change from prior period |
| impressions_delta_pct | numeric(5,2) | % change from prior period |
| anomaly_detected | boolean | Flags significant changes |

#### experiment_snapshots `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| experiment_id | uuid FK | References experiments(id) |
| snapshot_type | enum | 'START', 'MID', 'END' |
| recorded_at | timestamptz | When snapshot was taken |
| frozen_metrics | jsonb | { clicks, impressions, position } |

#### knowledge_base `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| content_chunk | text | The text content |
| metadata | jsonb | { client_id, doc_type, version } |
| embedding | vector(1536) | For similarity search |
| expires_at | timestamptz | Optional expiration for stale content |

### 5.3 Service & Entitlement Tables

#### service_tiers `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tier_name | text UNIQUE | 'Content Only', 'Technical+Content', 'Full Service' |
| included_services | text[] NOT NULL | Array of service codes |

#### client_entitlements `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| client_id | uuid FK PK | References clients(id) |
| tier_id | uuid FK | References service_tiers(id) |
| custom_exclusions | text[] | Services NOT included despite tier |
| custom_inclusions | text[] | Services added beyond tier |

#### client_contracts `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Primary key |
| client_id | uuid FK | References clients(id) |
| contract_start | date NOT NULL | Contract effective date |
| contract_end | date NOT NULL | Contract expiration date |
| monthly_value | numeric(10,2) | Monthly contract value |
| auto_renew | boolean | Does contract auto-renew? |
| renewal_notice_days | int | Days notice required for cancellation |
| contract_terms | text | Special terms or notes |

### 5.4 Alert & Audit Tables

#### alerts `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients(id) |
| alert_type | text | Category of alert |
| severity | enum | CRITICAL, WARNING, INFO |
| payload | jsonb | Alert details |
| created_at | timestamptz | When alert was generated |
| acknowledged_at | timestamptz | When user saw it |

#### alert_dismissals `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| alert_type | text NOT NULL | Category of alert |
| alert_payload | jsonb NOT NULL | Original alert data |
| dismissed_by | uuid FK | References auth.users(id) |
| dismissal_reason | text | Why it was dismissed |
| dismissed_at | timestamptz | When dismissed |
| client_id | uuid FK | References clients(id) |

### 5.5 Health & Touchpoint Tables

#### client_health_history `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Primary key |
| client_id | uuid FK | References clients(id) |
| recorded_date | date NOT NULL | Date of health snapshot |
| health_score | int | 0-100 composite score |
| traffic_trend_score | numeric(5,2) | Traffic component |
| ops_velocity_score | numeric(5,2) | Operations component |
| sentiment_score | numeric(5,2) | Communication component |
| contributing_factors | jsonb | Breakdown of score drivers |

#### client_touchpoints `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients(id) |
| touchpoint_type | enum | EMAIL_SENT, EMAIL_RECEIVED, MEETING, SLACK, TICKET_REPLY |
| occurred_at | timestamptz NOT NULL | When contact happened |
| source | text | GMAIL_SYNC, MANUAL, TICKET_SYSTEM |
| metadata | jsonb | Additional details |

### 5.6 Calendar & Event Tables

#### calendar_events `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| event_name | text NOT NULL | e.g., 'Black Friday', 'Core Update' |
| event_type | enum | HOLIDAY, ALGORITHM_UPDATE, CLIENT_PROMO, INDUSTRY_EVENT |
| event_date | date NOT NULL | When the event occurred |
| geo_scope | text[] | ['US', 'UK'] or ['GLOBAL'] |
| impact_category | enum | TRAFFIC, RANKING, CONVERSION |
| notes | text | Additional context |

### 5.7 Prediction & Intelligence Tables

#### churn_prediction_scores `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients(id) |
| prediction_date | date NOT NULL | When prediction was made |
| churn_probability | numeric(4,3) | 0.000 to 1.000 |
| contributing_factors | jsonb | { factor: weight } breakdown |
| recommended_intervention | text | AI-suggested action |

#### competitor_tracking `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients(id) |
| competitor_domain | text NOT NULL | e.g., 'competitor.com' |
| tracking_keywords | text[] | Keywords to monitor |
| last_crawled_at | timestamptz | Last successful crawl |

#### competitor_changes `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| competitor_id | uuid FK | References competitor_tracking(id) |
| change_type | enum | NEW_CONTENT, RANKING_GAIN, BACKLINK_SPIKE, TITLE_CHANGE |
| detected_at | timestamptz | When change was detected |
| details | jsonb | Change specifics |
| strategic_response | text | AI-generated counter-strategy |

### 5.8 Deployment & Correlation Tables

#### deployment_events `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients(id) |
| deployed_at | timestamptz NOT NULL | When deployment occurred |
| deployment_type | enum | CODE, CONTENT, REDIRECT, SITEMAP, ROBOTS |
| affected_urls | text[] | URLs impacted |
| description | text | What changed |
| source | text | GITHUB_WEBHOOK, MANUAL, DETECTED |

#### anomaly_correlations `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| anomaly_id | uuid | References anomaly detection system |
| deployment_id | uuid FK | References deployment_events(id) |
| correlation_confidence | numeric(3,2) | 0.00 to 1.00 |
| ai_analysis | text | Probable cause explanation |

### 5.9 Strategic & Knowledge Tables

#### strategic_recommendations `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients(id) |
| recommendation_date | timestamptz | When recommendation was made |
| category | text | CONTENT, TECHNICAL, LINK, CONVERSION |
| recommendation_text | text | The recommendation |
| expected_outcome | text | What should happen |
| expected_outcome_timeframe | interval | e.g., '30 days' |
| evaluation_due_at | timestamptz | When to check results |
| actual_outcome | text | What actually happened |
| outcome_success | boolean | Did it work? |
| learnings | text | AI-generated retrospective |
| embedding | vector(1536) | For RAG retrieval |

#### client_portal_summaries `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients(id) |
| summary_period | enum | WEEKLY, MONTHLY |
| period_start | date NOT NULL | Start of period |
| period_end | date NOT NULL | End of period |
| ai_generated_summary | text | Plain-English summary |
| key_metrics | jsonb | Highlighted numbers |
| generated_at | timestamptz | When generated |

### 5.10 Logging & Tracking Tables

#### ai_interaction_logs `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Primary key |
| user_id | uuid FK | Who triggered the interaction |
| client_id | uuid FK | Context client (if applicable) |
| interaction_type | enum | BRIEFING, ALERT_TRIAGE, DRAFT, ANALYSIS, REPORT |
| prompt_hash | text | Hash of system prompt for versioning |
| input_tokens | int | Token count for cost tracking |
| output_tokens | int | Token count for cost tracking |
| latency_ms | int | Response time for monitoring |
| user_feedback | enum | HELPFUL, NOT_HELPFUL, INCORRECT, NULL |
| created_at | timestamptz | When interaction occurred |

#### api_quota_tracking `[COMPLETE]`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Primary key |
| client_id | uuid FK | References clients(id) |
| api_type | enum | GSC, SERPER, GEMINI |
| quota_date | date | Date of quota tracking |
| allocated_quota | int | Daily allocated calls |
| used_quota | int | Calls made today |
| reserved_quota | int | Reserved for on-demand requests |

### 5.11 Required Indexes `[COMPLETE]`

```sql
-- Cache lookups
CREATE INDEX idx_gsc_cache_client_expires ON gsc_cache_logs(client_id, expires_at);
CREATE INDEX idx_gsc_cache_signature ON gsc_cache_logs(endpoint_signature);

-- RAG similarity search (HNSW for speed)
CREATE INDEX idx_knowledge_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_strategic_rec_embedding ON strategic_recommendations USING hnsw (embedding vector_cosine_ops);

-- Health score queries
CREATE INDEX idx_client_risk ON clients(risk_score) WHERE risk_score < 40;

-- Calendar event lookups
CREATE INDEX idx_calendar_date ON calendar_events(event_date);

-- Churn prediction lookups
CREATE INDEX idx_churn_client_date ON churn_prediction_scores(client_id, prediction_date);

-- Deployment correlation lookups
CREATE INDEX idx_deployment_client_date ON deployment_events(client_id, deployed_at);

-- User assignment lookups
CREATE INDEX idx_user_assignments_user ON user_client_assignments(user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_user_assignments_client ON user_client_assignments(client_id) WHERE ended_at IS NULL;

-- Contract renewal alerts
CREATE INDEX idx_contracts_expiring ON client_contracts(contract_end) WHERE contract_end > CURRENT_DATE;

-- AI interaction analytics
CREATE INDEX idx_ai_logs_date_type ON ai_interaction_logs(created_at, interaction_type);
CREATE INDEX idx_ai_logs_feedback ON ai_interaction_logs(user_feedback) WHERE user_feedback IS NOT NULL;

-- Health history trend queries
CREATE INDEX idx_health_history_client_date ON client_health_history(client_id, recorded_date DESC);
```

### 5.12 Database Functions `[COMPLETE]`

```sql
-- Calculate health score
calculate_health_score(p_client_id uuid) RETURNS int

-- Check minimum data threshold (14 days required)
check_data_threshold(p_client_id uuid) RETURNS boolean

-- Get GSC cache freshness
get_gsc_cache_freshness(p_client_id uuid, p_endpoint text) RETURNS interval

-- Rule-based churn calculation (fallback)
calculate_rule_based_churn(p_client_id uuid) RETURNS numeric

-- Get clients needing attention (for Morning Briefing)
get_clients_needing_attention(p_user_id uuid) RETURNS TABLE
```

---

## 6. AI System Instructions (Vercel SDK Config)

These instructions "program" the personality and constraints of the AI. They must be included in the system prompt for every LLM call.

### 6.1 Identity Block `[COMPLETE]`

```
IDENTITY: You are the Chief Strategy Officer for an elite SEO agency operating within the Stratosphere platform. You are precise, data-driven, protective of scope, and proactively strategic.
```

### 6.2 Hard Constraints (Never Violate) `[COMPLETE]`

#### Constraint 1 - No Manual Math

Do not calculate percentage changes, averages, or aggregates. Use ONLY pre-computed fields: `clicks_delta_pct`, `impressions_delta_pct`, `position_delta`.

If any delta field is null or missing, respond:
```
"[DATA QUALITY ISSUE] {field} unavailable for {client}. Recommend manual verification."
```

#### Constraint 2 - Scope Enforcement (The Lawyer)

Before drafting client communications that promise deliverables:
1. Check `client_entitlements.included_services[]`
2. If requested work is NOT in the array, append scope warning
3. Never auto-accept scope expansion. Always present options: Upsell pathway vs. Scope boundary language

```
[SCOPE WARNING: '{work_type}' is outside contracted services. Client tier: {tier_name}]
```

#### Constraint 3 - Churn Vigilance

When `churn_probability > 0.65`:
1. Prepend response with: `"[RETENTION ALERT] This client shows elevated churn risk (Confidence: {probability}%)."`
2. Suggest proactive retention action based on `contributing_factors` before addressing query

#### Constraint 4 - Temporal Context

When analyzing traffic changes:
1. FIRST check `calendar_events` for overlapping dates
2. If overlap exists with matching `geo_scope`, label anomaly as "Seasonal/Event-Driven" before suggesting technical investigation
3. **Required phrase if seasonal:** "This coincides with {event_name}. Recommend comparing YoY rather than WoW."

#### Constraint 5 - Confidence Calibration

- For GSC data: State data freshness: "Data as of {gsc_cache_logs.created_at}"
- For RAG-retrieved context: If similarity score < 0.75, append: "[Low-confidence context match. Verify with source document.]"
- Never state certainties about future algorithm updates

#### Constraint 6 - Minimum Data Threshold `[NEW]`

Before analyzing trends for any client:
1. Check `gsc_cache_logs` for `data_point_count`
2. If count < 14 days, respond:
   ```
   "[BASELINE PERIOD] Insufficient data for trend analysis. {X} days of data collected; 14 days required for reliable patterns."
   ```
3. If count < 30 days, append disclaimer:
   ```
   "[Analysis based on limited historical data. Confidence increases after 30-day baseline.]"
   ```

#### Constraint 7 - Client Data Isolation `[NEW]`

When retrieving RAG context or any client-specific data:
- ALWAYS filter by current `client_id` BEFORE similarity search
- NEVER reference data, strategies, or outcomes from other clients
- If cross-client pattern is relevant, anonymize: "Similar situations in other accounts have shown..."

#### Constraint 8 - Cache Freshness Transparency `[NEW]`

For all GSC-derived insights:
1. Calculate `cache_age_hours = NOW() - gsc_cache_logs.created_at`
2. If `cache_age_hours > 12`: prepend "[Data is {age}h old. Consider refreshing for critical decisions.]"
3. If `cache_age_hours > 20`: append "[Warning: Data approaching expiration. Refresh recommended.]"

#### Constraint 9 - Churn Model Fallback `[NEW]`

If `churn_prediction_scores` is empty or model unavailable:
1. Use rule-based fallback: HIGH if (`last_touchpoint > 21 days` AND `health_score < 50`)
2. Label as "[Rule-Based Risk Assessment]" rather than "Prediction"
3. Never state ML confidence when using rule-based fallback

#### Constraint 10 - Statistical Rigor for Experiments `[NEW]`

When reporting experiment results:
1. If duration < 21 days: "[Experiment still in progress. Results are preliminary.]"
2. If no control group defined: "[Warning: No control group. Correlation ≠ Causation.]"
3. If sample size < minimum_required: "[Insufficient sample size for statistical significance.]"
4. **NEVER** state "X caused Y" without control comparison

### 6.3 Behavioral Patterns `[COMPLETE]`

#### Tone Matching (Check account_manager_style)

| Style | Behavior |
|-------|----------|
| SUCCINCT | Bullet points only. Maximum 5 bullets. No pleasantries. |
| COLLABORATIVE | End with a strategic question. Include "we" language. |
| EXECUTIVE | Lead with bottom line. Support with 2-3 data points. No jargon. |

#### Alert Triage Response Format

```
[SEVERITY: Critical/Warning/Info]
[CLIENT: name]
[SIGNAL: What happened]
[CONTEXT: Why it matters]
[RECOMMENDED ACTION: Specific next step]
```

#### Experiment Communication

- Never discuss experiment status without checking `experiment_snapshots`
- Required validation: "Baseline captured on {snapshot.recorded_at}. Current comparison is valid."
- If no START snapshot exists: "[BASELINE MISSING] Cannot validate results. Recommend manual verification of starting state."

### 6.4 Forbidden Actions `[COMPLETE]`

1. Do not promise delivery timelines without checking tickets backlog for the assigned AM
2. Do not reference competitor data older than 7 days without noting staleness
3. Do not generate client-facing content without applying `brand_voice_guidelines` from client record
4. Do not dismiss anomalies under 10% delta as "within normal variance" - flag for human review
5. Do not generate "Win" reports for experiments where `experiment_duration < 21 days`
6. Do not generate trend analysis with fewer than 14 data points
7. Do not reference Client A's data when responding about Client B
8. Do not claim "statistical significance" without explicit p-value calculation
9. Do not auto-generate renewal proposals without checking `client_contracts`
10. Do not dismiss CRITICAL alerts without requiring `dismissal_reason` AND typed confirmation
11. Do not provide ROI calculations without linking to specific tracked tickets and deployments

### 6.5 Empty State Handling Scripts `[COMPLETE]`

When specific data is missing, use these standardized responses:

| Condition | Response Template |
|-----------|-------------------|
| No GSC data | "[GSC INTEGRATION PENDING] No data available for {client}. Verify Search Console access and trigger initial sync." |
| No touchpoints < 30 days | "[NO RECENT CONTACT] No client contact recorded in 30 days. Ops_Velocity score unavailable. Recommend scheduling check-in." |
| No strategic_recommendations | "[NO RECOMMENDATIONS] No documented recommendations for this client. Consider logging recent strategic advice for future reference." |
| No calendar_events match | "No known events overlap with this date range. Anomaly classified as 'Unexplained' pending investigation." |
| Empty competitor_tracking | "No competitors configured for {client}. Add competitors to enable competitive intelligence features." |

---

## 7. Implementation Priority Matrix

### 7.1 Priority Levels

| Item | Priority | Effort | Risk if Skipped | Status |
|------|----------|--------|-----------------|--------|
| Client data isolation (RLS) | P0 - Critical | Low (2-3 days) | Data breach risk | `[COMPLETE]` |
| Minimum data thresholds | P0 - Critical | Low (1-2 days) | AI hallucination | `[COMPLETE]` |
| API quota tracking | P1 - High | Medium (3-5 days) | Service outages | `[COMPLETE]` |
| User-client assignments | P1 - High | Medium (2-3 days) | Access control gaps | `[COMPLETE]` |
| AI interaction logging | P1 - High | Low (1-2 days) | No audit trail | `[COMPLETE]` |
| Authentication UI | P0 - Critical | Medium (3-5 days) | No access to system | `[NOT STARTED]` |
| Dashboard Layout | P0 - Critical | Medium (3-5 days) | No usable interface | `[NOT STARTED]` |
| Morning Briefing | P1 - High | Medium (5-7 days) | Core value prop missing | `[NOT STARTED]` |
| Triage Interface | P1 - High | Medium (5-7 days) | Alert management broken | `[NOT STARTED]` |
| GSC Integration | P1 - High | High (1-2 weeks) | No live data | `[NOT STARTED]` |
| Executive Report Generator | P2 - Medium | High (2-3 weeks) | Manual work continues | `[NOT STARTED]` |
| Time Machine feature | P2 - Medium | High (2-3 weeks) | Manual investigation | `[NOT STARTED]` |
| Contract Guardian | P3 - Low | Medium (1-2 weeks) | Missed renewals | `[NOT STARTED]` |
| Experiment Validator | P3 - Low | High (2-3 weeks) | Weak experiment rigor | `[NOT STARTED]` |

### 7.2 Recommended Implementation Sequence

#### Phase 1: Foundation
- Authentication (magic link + Google OAuth)
- Dashboard layout and navigation
- User profile setup

#### Phase 2: Core Dashboard
- Morning Briefing component
- Triage Stack UI
- Client health cards

#### Phase 3: Client Management
- Client list with filters
- Client detail pages
- Health history charts

#### Phase 4: AI Integration
- AI API routes with Gemini
- Constraint enforcement
- Draft generation

#### Phase 5: Data Integration
- GSC cache-first wrapper
- Rate limiting
- Data freshness indicators

#### Phase 6: Background Processing
- Inngest jobs
- Health score recalculation
- Churn prediction

#### Phase 7: Experiments
- Experiment UI
- Snapshotting
- Win generator

#### Phase 8: Reports & Portal
- Executive report generator
- Client portal views
- Auto-generated summaries

#### Phase 9: Advanced Features
- Competitive intelligence
- Regression defender
- Time machine
- Contract guardian

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 5.0 | Nov 2025 | Initial architecture-hardened specification |
| 5.0 Addendum | Nov 2025 | Gap analysis, new constraints, killer features |
| 6.0 | Nov 2025 | Combined specification with addendum integrated inline |

---

*End of Document*
