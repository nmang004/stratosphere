# Stratosphere Implementation Roadmap

**Version 1.0** | Based on SRS v6.0

---

## Current Implementation Status

### Complete (Foundation Layer)

| Component | Status | Location |
|-----------|--------|----------|
| Database Schema | 100% | `supabase/migrations/001_initial_schema.sql` |
| Database Functions | 100% | Included in migration |
| RLS Policies | 100% | Included in migration |
| Seed Data | 100% | `supabase/migrations/002_seed_data.sql` |
| AI Constraint System | 100% | `src/lib/ai/system-prompts.ts`, `src/lib/ai/constraints.ts` |
| Type Definitions | 100% | `src/types/database.ts` |
| Supabase Client | 100% | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` |
| Middleware | 100% | `src/middleware.ts`, `src/lib/supabase/middleware.ts` |
| UI Components | 100% | `src/components/ui/` (21 shadcn/ui components) |

### Complete (Application Layer - Phase 1)

| Component | Status | Location |
|-----------|--------|----------|
| Authentication UI | 100% | `src/app/(auth)/login/` |
| OAuth Callback | 100% | `src/app/(auth)/callback/route.ts` |
| User Onboarding | 100% | `src/app/(auth)/onboarding/page.tsx` |
| Dashboard Layout | 100% | `src/app/(dashboard)/layout.tsx` |
| Sidebar Navigation | 100% | `src/components/dashboard/Sidebar.tsx` |
| Top Navigation | 100% | `src/components/dashboard/TopNav.tsx` |
| User State Store | 100% | `src/stores/userStore.ts` |
| Dashboard Home | 100% | `src/app/(dashboard)/page.tsx` |

### Not Started (Application Layer)

| Component | Priority | Phase |
|-----------|----------|-------|
| Morning Briefing | P1 | Phase 2 |
| Triage Interface | P1 | Phase 2 |
| Client Management | P1 | Phase 3 |
| AI API Routes | P1 | Phase 4 |
| GSC Integration | P1 | Phase 5 |
| Background Jobs | P2 | Phase 6 |
| Experiments | P2 | Phase 7 |
| Reports & Portal | P2 | Phase 8 |
| Advanced Features | P3 | Phase 9 |

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authentication | Magic link + Google OAuth | Flexibility for different user preferences |
| Client Portal | Same app, `/portal/` routes | Simpler deployment, shared codebase |
| GSC Integration | Admin credentials + User OAuth | Admin for agency accounts, OAuth for client-owned |
| Churn Model | Rule-based for MVP | Uses existing DB function, upgradeable to ML later |

---

## Phase 1: Foundation ✅ COMPLETE

**Goal:** Working authentication and basic navigation

**Status:** Complete (November 2024)

### Tasks

1. ✅ Create login page with dual auth options
   - Magic link (email-based passwordless)
   - Google OAuth (Sign in with Google button)
2. ✅ Implement `/auth/callback` handler for both auth methods
3. ✅ Create authenticated layout with sidebar navigation
4. ✅ Build user profile setup flow (capture `account_manager_style`)
5. ✅ Test RLS policies work with authenticated user

### Files Created

```
src/app/(auth)/login/page.tsx          # Login page with Suspense wrapper
src/app/(auth)/login/LoginForm.tsx     # Login form component
src/app/(auth)/callback/route.ts       # OAuth callback with error handling
src/app/(auth)/onboarding/page.tsx     # User profile setup flow
src/app/(dashboard)/layout.tsx         # Protected layout wrapper
src/app/(dashboard)/page.tsx           # Dashboard home page
src/components/dashboard/Sidebar.tsx   # Navigation sidebar (desktop + mobile)
src/components/dashboard/TopNav.tsx    # Top navigation bar with user menu
src/stores/userStore.ts                # Zustand store for user state
```

### Acceptance Criteria

- [x] User can log in via magic link
- [x] User can log in via Google OAuth
- [x] User profile created in `user_profiles` table (via DB trigger)
- [x] Unauthenticated users redirected to login
- [x] Authenticated users see dashboard layout

### Implementation Notes

- Login uses Suspense boundary for `useSearchParams()`
- OAuth callback includes detailed error logging and specific error codes
- Database trigger `handle_new_user()` auto-creates profile from Google metadata
- Sidebar is responsive: fixed on desktop, Sheet component on mobile
- TopNav includes dynamic page titles based on route

---

## Phase 2: Morning Briefing & Triage

**Goal:** Core value prop - the Intelligence Dashboard

### Tasks

1. Build Morning Briefing component (FR-A1)
   - Query `get_clients_needing_attention()` function
   - Display prioritized alert stack
2. Build Triage Stack UI (swipe/dismiss interface)
   - Critical alerts require confirmation
   - Log dismissals to `alert_dismissals` table
3. Create Client Health Cards (FR-A2)
   - Display health scores with color coding
   - "Draft Retention Email" prompt when score < 40
4. Implement dismissed alerts audit trail (FR-A3)

### Files to Create

```
src/app/(dashboard)/page.tsx                    # Main dashboard
src/app/(dashboard)/triage/page.tsx             # Dedicated triage view
src/components/dashboard/MorningBriefing.tsx    # Briefing component
src/components/dashboard/TriageStack.tsx        # Alert stack UI
src/components/dashboard/AlertCard.tsx          # Individual alert card
src/components/dashboard/ClientHealthCard.tsx   # Health score card
src/lib/hooks/useAlerts.ts                      # Alert data hook
src/lib/hooks/useClients.ts                     # Client data hook
```

### Acceptance Criteria

- [ ] Dashboard shows prioritized alerts on load
- [ ] Alerts sorted by severity and recency
- [ ] Critical alerts require 3-second hold + typed confirmation
- [ ] All dismissals logged with reason
- [ ] Client health scores visible with color coding
- [ ] Low-health clients (< 40) trigger retention prompt

---

## Phase 3: Client Management

**Goal:** Full client visibility and health tracking

### Tasks

1. Build client list page with filters and search
2. Create client detail layout with tabs
3. Implement health history chart (Recharts)
4. Build touchpoint timeline
5. Display entitlements and contract info
6. Add churn risk indicators (FR 4.1)

### Files to Create

```
src/app/(dashboard)/clients/page.tsx                      # Client list
src/app/(dashboard)/clients/[clientId]/page.tsx           # Client overview
src/app/(dashboard)/clients/[clientId]/layout.tsx         # Client detail layout
src/components/clients/ClientList.tsx                     # List component
src/components/clients/ClientDetail.tsx                   # Detail view
src/components/clients/HealthHistoryChart.tsx             # Health chart
src/components/clients/TouchpointTimeline.tsx             # Contact history
src/components/clients/EntitlementsBadge.tsx              # Service tier badge
src/components/clients/ChurnRiskIndicator.tsx             # Churn warning
```

### Acceptance Criteria

- [ ] Can view all assigned clients
- [ ] Can filter by health score, tier, churn risk
- [ ] Can search clients by name
- [ ] Can drill into client details via tabs
- [ ] Health history shows 30-day trend chart
- [ ] Touchpoints display chronological timeline
- [ ] Churn warnings displayed when probability > 0.65

---

## Phase 4: AI Integration

**Goal:** AI-powered analysis and drafting

### Tasks

1. Create AI API routes with Vercel AI SDK + Gemini
2. Implement constraint enforcement middleware
3. Build "The Lawyer" guardrail (FR-B1)
4. Create draft generation UI
5. Implement SERP Shapeshifter (FR-C2)
6. Add data threshold validation (Constraint 6)

### Files to Create

```
src/app/api/ai/chat/route.ts              # General AI chat
src/app/api/ai/draft/route.ts             # Client communication drafts
src/app/api/ai/analyze/route.ts           # Analysis endpoint
src/lib/ai/middleware.ts                  # Constraint enforcement
src/components/shared/AIDraftPanel.tsx    # Draft generation UI
src/components/shared/ScopeWarning.tsx    # Scope violation alert
src/components/clients/SERPShapeshifter.tsx # SERP analysis tool
```

### Acceptance Criteria

- [ ] AI responses include all required constraint warnings
- [ ] Scope violations flagged before sending to client
- [ ] Data freshness warnings appear for stale data
- [ ] Churn warnings prepended when probability > 0.65
- [ ] Statistical rigor warnings for experiments
- [ ] All AI interactions logged to `ai_interaction_logs`

---

## Phase 5: GSC Integration

**Goal:** Cache-first GSC data fetching with dual credential support

### Tasks

1. Build GSC API client with cache-first strategy
2. Implement dual credential support
   - Admin-managed credentials for agency properties
   - User OAuth flow for client-owned properties
3. Implement rate limit handling with circuit breaker
4. Create GSC data visualization pages
5. Build data freshness indicators
6. Implement Temporal Context Engine (FR-C3)

### Files to Create

```
src/lib/gsc/client.ts                                # GSC API wrapper
src/lib/gsc/cache.ts                                 # Cache-first logic
src/lib/gsc/rateLimit.ts                             # Exponential backoff
src/lib/gsc/oauth.ts                                 # User OAuth flow
src/app/(dashboard)/clients/[clientId]/gsc/page.tsx  # GSC dashboard
src/components/clients/GSCMetricsChart.tsx           # Metrics visualization
src/components/clients/DataFreshnessIndicator.tsx    # Cache age indicator
src/components/clients/GSCConnectButton.tsx          # OAuth connect UI
src/app/api/gsc/[...path]/route.ts                   # GSC proxy route
src/app/api/gsc/oauth/callback/route.ts              # OAuth callback
```

### Acceptance Criteria

- [ ] GSC data fetched from cache when < 24h old
- [ ] Fresh data fetched when cache expired
- [ ] Admin can use central credentials for agency properties
- [ ] Users can OAuth-connect client-owned properties
- [ ] Cache staleness warnings shown (> 12h, > 20h)
- [ ] Rate limits respected with exponential backoff
- [ ] Calendar events checked for anomaly context

---

## Phase 6: Background Jobs

**Goal:** Automated data processing with Inngest

### Tasks

1. Set up Inngest client and webhook
2. Create daily GSC sync job (Shadow Sync)
3. Implement health score recalculation job
4. Build churn prediction job (rule-based)
5. Create morning briefing pre-generation

### Files to Create

```
src/lib/inngest/client.ts                          # Inngest client setup
src/lib/inngest/functions/syncGSC.ts               # Daily GSC sync
src/lib/inngest/functions/calculateHealthScores.ts # Health recalculation
src/lib/inngest/functions/predictChurn.ts          # Churn scoring
src/lib/inngest/functions/generateBriefing.ts      # Pre-gen briefing
src/app/api/inngest/route.ts                       # Inngest webhook
```

### Acceptance Criteria

- [ ] Daily sync runs at 04:00 UTC
- [ ] GSC data staggered with 2-second delays
- [ ] Health scores updated daily for all clients
- [ ] Churn predictions updated weekly
- [ ] Morning briefing ready before user login
- [ ] Failed jobs retry with exponential backoff

---

## Phase 7: Experiments & Knowledge

**Goal:** Experiment tracking and RAG knowledge management

### Tasks

1. Build experiment creation/management UI
2. Implement deterministic snapshotting
3. Create "Win Generator" for Slack
4. Build knowledge base management
5. Implement Strategic Copilot Memory

### Files to Create

```
src/app/(dashboard)/clients/[clientId]/experiments/page.tsx  # Experiment list
src/components/clients/ExperimentCard.tsx                    # Experiment card
src/components/clients/ExperimentForm.tsx                    # Create/edit form
src/lib/experiments/snapshot.ts                              # Snapshot logic
src/lib/slack/winGenerator.ts                                # Slack Block Kit
src/app/(dashboard)/knowledge/page.tsx                       # Knowledge mgmt
```

### Acceptance Criteria

- [ ] Can create experiments with treatment/control groups
- [ ] START snapshot captured automatically
- [ ] No results shown without baseline snapshot
- [ ] Win reports generated only for 21+ day experiments
- [ ] Recommendations tracked with expected outcomes
- [ ] Outcomes evaluated when due date arrives

---

## Phase 8: Reports & Portal

**Goal:** Executive reporting and client transparency portal

### Tasks

1. Build Executive Report Generator
2. Create report template system with brand voice
3. Implement client portal views (same app, `/portal/` routes)
4. Add auto-generated weekly/monthly summaries
5. Build shareable report links

### Files to Create

```
src/app/(dashboard)/reports/page.tsx                          # Report list
src/app/(dashboard)/reports/generate/page.tsx                 # Report builder
src/lib/reports/generator.ts                                  # AI report gen
src/lib/reports/templates.ts                                  # Templates
src/app/(portal)/layout.tsx                                   # Portal layout
src/app/(portal)/[clientSlug]/page.tsx                        # Client dashboard
src/app/(portal)/[clientSlug]/experiments/page.tsx            # Experiment status
src/app/(portal)/[clientSlug]/reports/[reportId]/page.tsx     # View report
src/components/portal/PortalHeader.tsx                        # Branded header
src/components/portal/TrafficSummary.tsx                      # Plain-English metrics
```

### Acceptance Criteria

- [ ] Reports generated with brand voice applied
- [ ] One-click export to PDF
- [ ] Client portal accessible at `/portal/[clientSlug]`
- [ ] Portal shows read-only data without authentication
- [ ] Weekly summaries auto-generated
- [ ] Shareable links work for specific reports

---

## Phase 9: Advanced Features

**Goal:** Competitive intelligence, regression detection, and analytics

### Tasks

1. Build Competitive Intelligence Autopilot
2. Implement Regression Defender
3. Create "What Changed?" Time Machine
4. Build Contract Guardian
5. Implement Experiment Validator with statistics

### Files to Create

```
src/app/(dashboard)/clients/[clientId]/competitors/page.tsx  # Competitor view
src/components/clients/CompetitorBriefing.tsx                # Competitor analysis
src/components/clients/TimeMachine.tsx                       # Timeline investigation
src/components/clients/RegressionAlert.tsx                   # Deployment correlation
src/lib/stats/significanceTest.ts                            # Statistical testing
```

### Acceptance Criteria

- [ ] Competitor changes tracked weekly
- [ ] Competitive briefing generated with counter-strategies
- [ ] Deployments correlated with traffic anomalies
- [ ] Interactive timeline shows all events ±7 days
- [ ] Contract renewal alerts at 90/60/30 days
- [ ] Statistical significance calculated with p-values
- [ ] Experiment results include confidence intervals

---

## Critical Files Reference

### Must Read Before Implementation

| File | Purpose |
|------|---------|
| `src/lib/ai/system-prompts.ts` | AI constraint system implementation |
| `src/lib/ai/constraints.ts` | Constraint enforcement utilities |
| `src/types/database.ts` | All TypeScript types for database |
| `supabase/migrations/001_initial_schema.sql` | Full schema reference |
| `supabase/migrations/002_seed_data.sql` | Test data for development |

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | All dependencies |
| `components.json` | shadcn/ui configuration (new-york style) |
| `.env.example` | Required environment variables |

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=

# Google Search Console
GSC_CLIENT_ID=
GSC_CLIENT_SECRET=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development Commands

```bash
# Start development server
npm run dev

# Run Inngest dev server (separate terminal)
npx inngest-cli dev

# Generate types from Supabase
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts

# Run database migrations
npx supabase db push
```

---

## Summary

**Total Phases:** 9
**Phases Complete:** 1 of 9
**Files Created:** ~60 files

### Progress Overview

| Phase | Status | Description |
|-------|--------|-------------|
| Foundation | ✅ Complete | Database, types, AI constraints, UI components |
| Phase 1 | ✅ Complete | Authentication & Dashboard Layout |
| Phase 2 | 🔲 Not Started | Morning Briefing & Triage |
| Phase 3 | 🔲 Not Started | Client Management |
| Phase 4 | 🔲 Not Started | AI Integration |
| Phase 5 | 🔲 Not Started | GSC Integration |
| Phase 6 | 🔲 Not Started | Background Jobs |
| Phase 7 | 🔲 Not Started | Experiments & Knowledge |
| Phase 8 | 🔲 Not Started | Reports & Portal |
| Phase 9 | 🔲 Not Started | Advanced Features |

**Next Step:** Begin Phase 2 - Morning Briefing & Triage Interface
