# Stratosphere
## Forensics Console Edition
### Software Requirements Specification

**Version 7.0** | Forensics Pivot

| Field | Value |
|-------|-------|
| Document Status | APPROVED |
| Technology Stack | Next.js 14 (App Router), Supabase, Vercel AI SDK, Google Gemini, Serper.dev |
| Last Updated | November 2024 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Scope](#2-product-scope)
3. [User Persona](#3-user-persona)
4. [Functional Requirements](#4-functional-requirements)
5. [Handbook Constraints](#5-handbook-constraints)
6. [Database Schema](#6-database-schema)
7. [AI System Instructions](#7-ai-system-instructions)
8. [External Interfaces](#8-external-interfaces)
9. [Non-Functional Requirements](#9-non-functional-requirements)

---

## 1. Executive Summary

Stratosphere is a **Forensic Intelligence Sidecar** for Senior Ranking Strategists. It reduces "Investigation Time" for SEO support tickets from 30 minutes to 30 seconds by automating data collection (Forensics) and enforcing agency protocols (The Ranking 2.0 Handbook) via AI.

### 1.1 Core Philosophy

**"30 Minutes to 30 Seconds"**

The tool automates investigation, not decision-making. Strategists retain full control while the system handles:
- Data collection from SERP APIs
- Algorithm update correlation
- Handbook constraint validation
- Draft email generation

### 1.2 Version 7.0 Changes (Forensics Pivot)

This version represents a complete pivot from "Client Health Dashboard" to "Forensics Console":

**Removed:**
- Churn Prediction System
- Client Health Scoring
- Entitlements/Service Tiers
- AI Chat History with conversation persistence
- Google Search Console Integration
- Background Jobs (most)
- Client Management Pages

**Added:**
- Serper.dev SERP API Integration
- Forensic Analysis Engine
- Algorithm Correlation (Algo Overlay)
- Ranking Loss Detection (Nuke Detector)
- Keyword Cannibalization Detection
- Handbook-Constrained AI System
- Ticket Command Center UI
- AM Persona-Based Draft Generation

---

## 2. Product Scope

### 2.1 In Scope

| Feature | Description |
|---------|-------------|
| Ticket Analysis | Paste AM tickets, get AI-powered root cause analysis |
| Live SERP Verification | Check ranking claims in real-time via Serper.dev |
| Algorithm Correlation | Overlay traffic changes against Google algorithm updates |
| Handbook Enforcement | AI respects 9-Month Rule, Queue System, Mapping rules |
| Persona-Based Drafts | Generate emails tailored to AM personality types |

### 2.2 Out of Scope

| Feature | Reason |
|---------|--------|
| Client Health Tracking | Removed in forensics pivot |
| Churn Prediction | Removed in forensics pivot |
| GSC Integration | Removed in forensics pivot |
| Conversation History | Removed in forensics pivot |
| Multi-tenant Client Management | Removed in forensics pivot |

---

## 3. User Persona

### 3.1 Primary User: Senior Ranking Strategist

| Attribute | Description |
|-----------|-------------|
| Role | Senior SEO Strategist |
| Daily Volume | 10-20 support tickets requiring investigation |
| Pain Point | Each ticket takes 30+ minutes of manual data gathering |
| Goal | Reduce investigation time while maintaining quality |
| Context | Must follow Ranking 2.0 Handbook protocols |

### 3.2 Secondary User: Account Manager (AM)

AMs are not direct users but their personalities affect output:

| Persona | ID | Characteristics |
|---------|-----|-----------------|
| Panic Patty | `PANIC_PATTY` | Anxious, needs reassurance, appreciates data |
| Technical Tom | `TECHNICAL_TOM` | Wants details, understands SEO concepts |
| Ghost Gary | `GHOST_GARY` | Minimal contact, needs brief action items |

---

## 4. Functional Requirements

### FR-01: Ticket Analysis

**Input:**
- Ticket body (raw AM email/message)
- Target domain
- AM persona selection
- Optional: Target query, location, page metadata

**Process:**
1. Parse ticket for signals (ranking complaints, traffic drops, etc.)
2. Execute live SERP check if query provided
3. Correlate with algorithm update calendar
4. Check page against 9-Month Rule
5. Evaluate Mapping Rule if applicable
6. Generate verdict and strategy recommendation
7. Draft persona-appropriate response email

**Output:**
```typescript
{
  verdict: VerdictType;
  rootCause: string;
  strategy: StrategyType | null;
  evidence: string[];
  confidence: number;
  nineMonthCheck?: NineMonthCheck;
  draftEmail: string;
  forensicData: ForensicData;
  warnings: string[];
}
```

### FR-02: Live SERP Verification

**Capability:** Real-time Google SERP data via Serper.dev API

**Features:**
- Check if domain ranks for target query
- Identify ranking position
- List SERP features present
- Identify top competitors
- Cache responses for 24 hours

**Guard:** Cache-first strategy to minimize API costs

### FR-03: Algorithm Correlation

**Capability:** Overlay traffic anomalies against known algorithm updates

**Data Source:** Internal `GOOGLE_ALGORITHM_UPDATES` constant

**Features:**
- Identify updates within configurable date range
- Classify impact level (HIGH, MEDIUM, LOW)
- Provide context for traffic changes

### FR-04: Handbook Constraint Enforcement

**The AI must enforce three critical rules:**

#### 9-Month Rule
- Pages < 6 months old: Cannot be optimized
- Pages optimized < 9 months ago: Cannot be re-optimized
- If locked: Recommend Digital PR or authority-building

#### The Queue
- All content work scheduled 3 months out
- Never suggest immediate content changes
- Frame as quarterly scheduling

#### Mapping Rule
- Generic pages cannot rank for geo queries
- Strategy: Unmap and create geo-specific page
- Never optimize generic for location intent

---

## 5. Handbook Constraints

### 5.1 Allowed Strategies

The AI can ONLY recommend these strategies:

| Strategy | ID | Use Case | 9-Month Required |
|----------|-----|----------|------------------|
| Mini-Homepage | `MINI_HOMEPAGE` | Multi-location issues | No |
| Areas We Serve Build | `AREAS_WE_SERVE` | Missing geo-pages | No |
| Content Refresh | `CONTENT_REFRESH` | Page optimization | **Yes** |
| Digital PR | `DIGITAL_PR` | Authority building | No |
| Web Health Fix | `WEB_HEALTH_FIX` | Technical issues | No |
| Unmap and Create | `UNMAP_AND_CREATE` | Mapping violations | No |

### 5.2 Verdict Types

| Verdict | Description |
|---------|-------------|
| `FALSE_ALARM` | No actual problem found |
| `TECHNICAL_FAILURE` | 404, schema, CWV issues |
| `COMPETITOR_WIN` | Competitor outranking legitimately |
| `ALGO_IMPACT` | Algorithm update correlation |
| `CANNIBALIZATION` | Internal pages competing |
| `NEEDS_INVESTIGATION` | Insufficient data for verdict |

---

## 6. Database Schema

### 6.1 New Tables

#### serper_cache

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Primary key |
| query | text | Search query (lowercase, trimmed) |
| location | text | Geographic location |
| gl | text | Country code (default: 'us') |
| response | jsonb | Full Serper API response |
| created_at | timestamptz | Cache timestamp |
| expires_at | timestamptz | Expiration time |

**Indexes:**
- `idx_serper_cache_expires` on `expires_at`
- `idx_serper_cache_query` on `query`
- Unique constraint on `(query, location, gl)`

#### ticket_analyses

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Primary key |
| user_id | uuid FK | References auth.users |
| ticket_body | text | Original ticket text |
| target_domain | text | Client domain |
| am_persona | enum | PANIC_PATTY, TECHNICAL_TOM, GHOST_GARY |
| page_metadata | jsonb | Optional page info |
| verdict | text | AI verdict |
| root_cause | text | Root cause analysis |
| strategy | text | Recommended strategy |
| evidence | jsonb | Supporting evidence array |
| confidence | decimal(3,2) | 0.00 - 1.00 |
| draft_email | text | Generated email |
| forensic_data | jsonb | All forensic data |
| warnings | jsonb | Warning messages |
| model_used | text | AI model identifier |
| latency_ms | int | Response time |
| created_at | timestamptz | Analysis timestamp |

**Indexes:**
- `idx_ticket_analyses_user` on `user_id`
- `idx_ticket_analyses_domain` on `target_domain`
- `idx_ticket_analyses_created` on `created_at DESC`
- `idx_ticket_analyses_verdict` on `verdict`

### 6.2 Database Functions

```sql
-- Get cached Serper response
get_serper_cache(p_query, p_location, p_gl) RETURNS jsonb

-- Set Serper cache with TTL
set_serper_cache(p_query, p_response, p_location, p_gl, p_ttl_hours) RETURNS void

-- Clean expired cache entries
cleanup_serper_cache() RETURNS int
```

### 6.3 Row Level Security

- `serper_cache`: Read access for all authenticated users (shared cache)
- `serper_cache`: Write access for service role only
- `ticket_analyses`: Users can only access their own analyses

---

## 7. AI System Instructions

### 7.1 Identity Block

```
IDENTITY: You are a Senior Ranking Strategist AI for Scorpion, operating within the Stratosphere Forensics Console. You enforce the Ranking 2.0 Handbook and help strategists investigate tickets quickly and accurately.
```

### 7.2 Hard Constraints

#### Constraint 1 - 9-Month Rule Enforcement
Before recommending Content Refresh:
1. Check `pageMetadata.lastOptimizationDate`
2. If < 9 months ago, BLOCK recommendation
3. Suggest Digital PR or other authority strategies instead

#### Constraint 2 - Queue System
- Never suggest immediate content changes
- All content work frames as "Add to [Quarter] queue"
- Calculate next available quarter dynamically

#### Constraint 3 - Mapping Rule
When analyzing ranking issues:
1. Detect if page is generic (no geo in URL)
2. Detect if query is geo-targeted
3. If mismatch, recommend UNMAP_AND_CREATE

#### Constraint 4 - Strategy Restriction
Only recommend strategies from the allowed list:
- MINI_HOMEPAGE
- AREAS_WE_SERVE
- CONTENT_REFRESH (if 9-month passes)
- DIGITAL_PR
- WEB_HEALTH_FIX
- UNMAP_AND_CREATE

### 7.3 Persona Adaptation

| Persona | Response Style |
|---------|----------------|
| PANIC_PATTY | Reassuring tone, lead with good news, heavy data support |
| TECHNICAL_TOM | Detailed technical analysis, root cause focus |
| GHOST_GARY | Brief bullets, action items only, no fluff |

### 7.4 Forbidden Actions

1. Never recommend optimizing 9-month locked pages
2. Never suggest immediate content changes (Queue rule)
3. Never try to rank generic pages for geo queries
4. Never claim causation without data ("caused by" → "correlates with")
5. Never make ranking timeline promises
6. Never recommend strategies outside the allowed list

---

## 8. External Interfaces

### 8.1 Serper.dev API

**Purpose:** Real-time Google SERP data

**Endpoint:** `POST https://google.serper.dev/search`

**Request:**
```json
{
  "q": "search query",
  "location": "Austin, Texas",
  "gl": "us",
  "num": 20
}
```

**Response:** Full SERP data including organic results, SERP features, position data

**Rate Limits:** Managed via caching (24-hour TTL)

### 8.2 Google Gemini API

**Purpose:** AI analysis and response generation

**Model:** `gemini-2.0-flash` (configurable)

**Integration:** Via Vercel AI SDK (`@ai-sdk/google`)

### 8.3 Supabase

**Purpose:** Database, authentication, caching

**Features Used:**
- PostgreSQL database
- Row Level Security
- Database functions (RPC)
- Authentication (Magic Link + Google OAuth)

---

## 9. Non-Functional Requirements

### 9.1 Performance

| Metric | Target |
|--------|--------|
| Analysis Latency | < 15 seconds |
| SERP Cache Hit | > 80% for repeated queries |
| UI Response | < 100ms for interactions |

### 9.2 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| AI Accuracy | < 1% hallucination rate |
| Cache Integrity | No stale data served after expiration |

### 9.3 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Supabase Auth (Magic Link + Google OAuth) |
| Authorization | Row Level Security on all tables |
| API Keys | Server-side only, never exposed to client |
| Data Isolation | Users can only access their own analyses |

### 9.4 Scalability

| Aspect | Approach |
|--------|----------|
| API Costs | Cache-first strategy for SERP data |
| Database | Supabase managed PostgreSQL |
| Compute | Vercel serverless functions |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 6.0 | Nov 2024 | Client Health Dashboard specification |
| 7.0 | Nov 2024 | Complete pivot to Forensics Console |

---

*End of Document*
