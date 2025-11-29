# Stratosphere Forensics Console - Implementation Roadmap

**Version 2.0** | Forensics Pivot Complete

---

## Current Implementation Status

### Complete (Forensics Console)

| Component | Status | Location |
|-----------|--------|----------|
| Database Schema (Forensics) | 100% | `supabase/migrations/008_forensics_purge.sql` |
| Serper.dev Integration | 100% | `src/lib/serper/` |
| Forensics Engine | 100% | `src/lib/forensics/` |
| AI System (Handbook-Constrained) | 100% | `src/lib/ai/` |
| Ticket Command Center UI | 100% | `src/app/(dashboard)/page.tsx` |
| Authentication | 100% | `src/app/(auth)/` |
| Dashboard Layout | 100% | `src/app/(dashboard)/layout.tsx` |

### Retained from Previous Version

| Component | Status | Location |
|-----------|--------|----------|
| Supabase Client | 100% | `src/lib/supabase/` |
| UI Components | 100% | `src/components/ui/` (shadcn/ui) |
| Middleware | 100% | `src/middleware.ts` |
| User Store | 100% | `src/stores/userStore.ts` |

---

## Architecture Overview

### The Pivot

Stratosphere pivoted from a "Client Health Dashboard" (Account Manager tool) to a "Forensics Console" (Strategist tool). The goal: reduce SEO investigation time from 30 minutes to 30 seconds.

### What Was Removed

- Churn Prediction System
- Client Health Scoring
- Entitlements/Service Tiers
- AI Chat History
- GSC Integration
- Background Jobs (most)
- Client Management Pages
- Triage Stack

### What Was Added

- Serper.dev SERP API Integration
- Forensic Analysis Engine
- Algorithm Correlation (Algo Overlay)
- Nuke Detector (Ranking Loss Detection)
- Cannibalization Detection
- Handbook-Constrained AI System
- Ticket Command Center UI
- AM Persona-Based Responses

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SERP API | Serper.dev | Cost-effective, fast, reliable |
| AI Model | Google Gemini 2.0 Flash | Speed + quality balance |
| Database Cleanup | Hard delete | Clean slate for forensics |
| Handbook Implementation | Iterative | Start with core rules |

---

## Project Structure (Post-Pivot)

```
src/
├── app/
│   ├── (auth)/                    # Login, onboarding
│   │   ├── login/
│   │   ├── callback/
│   │   └── onboarding/
│   ├── (dashboard)/               # Main app
│   │   ├── page.tsx               # Ticket Command Center
│   │   ├── layout.tsx
│   │   └── settings/
│   └── api/
│       ├── ai/
│       │   └── analyze-ticket/    # Main forensics endpoint
│       └── inngest/               # Background jobs (minimal)
├── components/
│   ├── forensics/                 # Ticket analysis UI
│   │   ├── TicketInputPanel.tsx
│   │   ├── ResultsPanel.tsx
│   │   ├── VerdictCard.tsx
│   │   └── DraftEmailPanel.tsx
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   └── TopNav.tsx
│   └── ui/                        # shadcn/ui components
├── lib/
│   ├── ai/                        # AI system
│   │   ├── system-prompts.ts      # Handbook-constrained prompts
│   │   ├── constraints.ts         # Rule enforcement
│   │   ├── middleware.ts          # Request processing
│   │   └── types.ts
│   ├── forensics/                 # Analysis modules
│   │   ├── algo-overlay.ts        # Algorithm correlation
│   │   ├── nuke-detector.ts       # Ranking loss detection
│   │   ├── cannibalization.ts     # Keyword cannibalization
│   │   ├── market-check.ts        # Live SERP wrapper
│   │   └── constants.ts           # Handbook rules
│   ├── serper/                    # SERP API
│   │   ├── client.ts              # API client
│   │   ├── cache.ts               # Response caching
│   │   └── types.ts
│   ├── supabase/                  # Database client
│   └── inngest/                   # Background jobs
└── stores/
    └── userStore.ts
```

---

## Database Schema (Forensics)

### New Tables

#### serper_cache

Caches Serper.dev API responses to reduce costs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| query | text | Search query |
| location | text | Geographic location |
| gl | text | Country code (default: 'us') |
| response | jsonb | Full API response |
| created_at | timestamptz | Cache timestamp |
| expires_at | timestamptz | Expiration (default: 24h) |

#### ticket_analyses

Stores analysis history for audit and learning.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User who ran analysis |
| ticket_body | text | Original ticket text |
| target_domain | text | Client domain |
| am_persona | text | Persona used |
| verdict | text | AI verdict |
| root_cause | text | Root cause analysis |
| strategy | text | Recommended strategy |
| evidence | jsonb | Supporting evidence |
| confidence | decimal | Confidence score (0-1) |
| draft_email | text | Generated email |
| forensic_data | jsonb | All forensic data |
| warnings | jsonb | Any warnings |
| model_used | text | AI model identifier |
| latency_ms | int | Response time |
| created_at | timestamptz | Analysis timestamp |

### Removed Tables

- `churn_prediction_scores`
- `service_tiers`
- `client_entitlements`
- `ai_conversations`
- `ai_messages`
- `gsc_cache_logs`
- `gsc_aggregates`

---

## Handbook Constraints (Ranking 2.0)

The AI enforces these three critical rules:

### 1. The 9-Month Rule

- Pages created < 6 months ago: Cannot be optimized
- Pages optimized < 9 months ago: Cannot be re-optimized
- If locked: Recommend Digital PR or authority-building strategies

### 2. The Queue

- All content work is scheduled 3 months out
- Never suggest immediate content changes
- Frame as: "Add to Q3 queue" or "Schedule for next quarter"

### 3. Mapping Rule

- Generic pages cannot rank for geo-specific queries
- Strategy: UNMAP and CREATE NEW geo-specific page
- Never try to optimize generic page for location queries

---

## Allowed Strategies

The AI can ONLY recommend these strategies:

| Strategy | ID | Use Case |
|----------|-----|----------|
| Mini-Homepage | `MINI_HOMEPAGE` | Multi-location issues |
| Areas We Serve Build | `AREAS_WE_SERVE` | Missing geo-pages |
| Content Refresh | `CONTENT_REFRESH` | ONLY if 9-month rule passed |
| Digital PR | `DIGITAL_PR` | When page is 9-month locked |
| Web Health Fix | `WEB_HEALTH_FIX` | 404s, Schema errors, CWV |
| Unmap and Create | `UNMAP_AND_CREATE` | Generic page ranking for geo query |

---

## AM Personas

The AI adapts tone based on AM personality:

| Persona | ID | Tone |
|---------|-----|------|
| Panic Patty | `PANIC_PATTY` | Reassuring, data-heavy, calming |
| Technical Tom | `TECHNICAL_TOM` | Detailed root cause, technical |
| Ghost Gary | `GHOST_GARY` | Brief bullets, action-focused |

---

## API Endpoints

### POST `/api/ai/analyze-ticket`

Main forensics analysis endpoint.

**Request:**
```typescript
{
  ticketBody: string;        // AM's ticket/email
  targetDomain: string;      // e.g., "example.com"
  amPersona: 'PANIC_PATTY' | 'TECHNICAL_TOM' | 'GHOST_GARY';
  targetQuery?: string;      // Optional keyword for SERP check
  location?: string;         // Optional geo location
  pageMetadata?: {
    url: string;
    lastOptimizationDate?: string;
    createdDate?: string;
    pageType?: 'GENERIC' | 'GEO' | 'SERVICE';
  };
}
```

**Response:**
```typescript
{
  verdict: 'FALSE_ALARM' | 'TECHNICAL_FAILURE' | 'COMPETITOR_WIN' |
           'ALGO_IMPACT' | 'CANNIBALIZATION' | 'NEEDS_INVESTIGATION';
  rootCause: string;
  strategy: string | null;
  evidence: string[];
  confidence: number;  // 0.0 - 1.0
  nineMonthCheck?: { isLocked: boolean; reason: string };
  draftEmail: string;
  forensicData: {
    marketCheck?: MarketCheckResult;
    algoOverlay?: AlgoOverlayResult;
  };
  warnings: string[];
  modelUsed: string;
  latencyMs: number;
}
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=

# Serper.dev
SERPER_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Development Commands

```bash
# Start development server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Run Inngest dev server (if using background jobs)
npx inngest-cli dev
```

---

## Future Enhancements

### Phase 2: Enhanced Forensics

- [ ] Ahrefs API integration for backlink analysis
- [ ] Historical ranking trends
- [ ] Automated screenshot capture
- [ ] Bulk ticket analysis

### Phase 3: Learning System

- [ ] Outcome tracking for recommendations
- [ ] Strategy effectiveness dashboard
- [ ] AI learning from successful resolutions

### Phase 4: Integrations

- [ ] Slack notifications for critical findings
- [ ] Jira/Asana ticket creation
- [ ] Email integration for draft sending

---

## Migration Notes

### From v1.x (Client Health Dashboard)

1. Run `supabase/migrations/008_forensics_purge.sql`
   - Uses CASCADE to drop functions with dependencies
   - Removes all deprecated tables
   - Creates new forensics tables

2. Update environment variables
   - Add `SERPER_API_KEY`
   - Remove GSC-related variables

3. Clear `.next` directory if experiencing stale route errors

---

## Summary

**Total Components:** ~40 files
**Status:** Forensics Pivot Complete

| Area | Status |
|------|--------|
| Database | Migrated to forensics schema |
| API | Analyze-ticket endpoint complete |
| UI | Ticket Command Center complete |
| AI | Handbook-constrained prompts active |
| SERP | Serper.dev integration with caching |

**Next Step:** Deploy and test with real tickets

---

*Document updated: November 2024*
