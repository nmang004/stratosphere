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

### Complete (Application Layer - Phase 2)

| Component | Status | Location |
|-----------|--------|----------|
| Alert Utilities | 100% | `src/lib/utils/alerts.ts` |
| Alert Data Hooks | 100% | `src/lib/hooks/useAlerts.ts` |
| Client Data Hooks | 100% | `src/lib/hooks/useClients.ts` |
| React Query Provider | 100% | `src/components/providers/QueryProvider.tsx` |
| Morning Briefing | 100% | `src/components/dashboard/MorningBriefing.tsx` |
| Alert Card | 100% | `src/components/dashboard/AlertCard.tsx` |
| Client Health Card | 100% | `src/components/dashboard/ClientHealthCard.tsx` |
| Client Health Section | 100% | `src/components/dashboard/ClientHealthSection.tsx` |
| Dismiss Alert Modal | 100% | `src/components/dashboard/DismissAlertModal.tsx` |
| Triage Stack | 100% | `src/components/dashboard/TriageStack.tsx` |
| Triage Page | 100% | `src/app/(dashboard)/triage/page.tsx` |

### Complete (Application Layer - Phase 3)

| Component | Status | Location |
|-----------|--------|----------|
| Client List Page | 100% | `src/app/(dashboard)/clients/page.tsx` |
| ClientList Component | 100% | `src/components/clients/ClientList.tsx` |
| Client Detail Layout | 100% | `src/app/(dashboard)/clients/[clientId]/layout.tsx` |
| Client Overview Page | 100% | `src/app/(dashboard)/clients/[clientId]/page.tsx` |
| Health History Page | 100% | `src/app/(dashboard)/clients/[clientId]/health/page.tsx` |
| Touchpoints Page | 100% | `src/app/(dashboard)/clients/[clientId]/touchpoints/page.tsx` |
| HealthHistoryChart | 100% | `src/components/clients/HealthHistoryChart.tsx` |
| TouchpointTimeline | 100% | `src/components/clients/TouchpointTimeline.tsx` |
| EntitlementsBadge | 100% | `src/components/clients/EntitlementsBadge.tsx` |
| ChurnRiskIndicator | 100% | `src/components/clients/ChurnRiskIndicator.tsx` |
| ContractCard | 100% | `src/components/clients/ContractCard.tsx` |
| LogTouchpointModal | 100% | `src/components/clients/LogTouchpointModal.tsx` |
| Extended Client Hooks | 100% | `src/lib/hooks/useClients.ts` |
| Expanded Seed Data | 100% | `supabase/migrations/003_expanded_seed_data.sql` |

### Not Started (Application Layer)

| Component | Priority | Phase |
|-----------|----------|-------|
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

## Phase 2: Morning Briefing & Triage ✅ COMPLETE

**Goal:** Core value prop - the Intelligence Dashboard

**Status:** Complete (November 2024)

### Tasks

1. ✅ Build Morning Briefing component (FR-A1)
   - Query alerts with React Query hooks
   - Display prioritized alert stack sorted by severity
2. ✅ Build Triage Stack UI (swipe/dismiss interface)
   - Critical alerts require 3-second hold + typed "DISMISS" confirmation
   - Keyboard navigation (← dismiss, → action, ↓ next)
   - Log dismissals with reason selection
3. ✅ Create Client Health Cards (FR-A2)
   - Display health scores with color coding (red <40, yellow 40-70, green >70)
   - Churn risk badge when probability > 0.65
   - Trend indicators (↑ improving, ↓ declining, → stable)
4. ✅ Implement dismissed alerts audit trail (FR-A3)

### Files Created

```
src/lib/utils/alerts.ts                         # Severity colors, icons, formatting
src/lib/hooks/useAlerts.ts                      # useAlerts, useActiveAlerts, useDismissAlert
src/lib/hooks/useClients.ts                     # useClients, useClientsWithHealth
src/components/providers/QueryProvider.tsx      # React Query provider
src/app/(dashboard)/page.tsx                    # Main dashboard (updated)
src/app/(dashboard)/triage/page.tsx             # Dedicated triage view
src/components/dashboard/MorningBriefing.tsx    # Briefing component
src/components/dashboard/TriageStack.tsx        # Alert stack UI with keyboard nav
src/components/dashboard/AlertCard.tsx          # Individual alert card
src/components/dashboard/ClientHealthCard.tsx   # Health score card
src/components/dashboard/ClientHealthSection.tsx # Client health overview
src/components/dashboard/DismissAlertModal.tsx  # Dismiss modal with CRITICAL handling
```

### Acceptance Criteria

- [x] Dashboard shows prioritized alerts on load
- [x] Alerts sorted by severity (CRITICAL > WARNING > INFO)
- [x] Critical alerts require 3-second hold + typed "DISMISS" confirmation
- [x] All dismissals logged with reason
- [x] Client health scores visible with color coding
- [x] Churn risk badge appears when probability > 0.65
- [x] Empty states display appropriately
- [x] Mobile responsive layout
- [x] Loading states while fetching data

### Implementation Notes

- React Query used for data fetching with 1-minute stale time
- Keyboard shortcuts: ← dismiss, → action, ↓/↑ navigate stack
- Filter tabs: All, Critical, Warning, Info, Dismissed
- Sort options: Newest, Oldest, Severity
- View modes: Stack (card-based) and List

---

## Phase 3: Client Management ✅ COMPLETE

**Goal:** Full client visibility and health tracking

**Status:** Complete (November 2024)

### Tasks

1. ✅ Build client list page with filters and search
2. ✅ Create client detail layout with tabs
3. ✅ Implement health history chart (Recharts)
4. ✅ Build touchpoint timeline
5. ✅ Display entitlements and contract info
6. ✅ Add churn risk indicators (FR 4.1)
7. ✅ Create expanded seed data for diverse demo scenarios

### Files Created

```
src/app/(dashboard)/clients/page.tsx                          # Client list with filters
src/app/(dashboard)/clients/[clientId]/layout.tsx             # Client detail layout with tabs
src/app/(dashboard)/clients/[clientId]/page.tsx               # Client overview
src/app/(dashboard)/clients/[clientId]/health/page.tsx        # Health history page
src/app/(dashboard)/clients/[clientId]/touchpoints/page.tsx   # Touchpoints page
src/components/clients/ClientList.tsx                         # Grid/List view component
src/components/clients/HealthHistoryChart.tsx                 # Recharts line chart
src/components/clients/TouchpointTimeline.tsx                 # Vertical timeline
src/components/clients/EntitlementsBadge.tsx                  # Service tier badge with popover
src/components/clients/ChurnRiskIndicator.tsx                 # Churn warning with factors
src/components/clients/ContractCard.tsx                       # Contract info with progress
src/components/clients/LogTouchpointModal.tsx                 # Manual touchpoint entry
src/lib/hooks/useClients.ts                                   # Extended with new hooks
src/types/database.ts                                         # Added touchpoint/contract types
supabase/migrations/003_expanded_seed_data.sql                # 5 additional test clients
```

### Acceptance Criteria

- [x] Can view all assigned clients
- [x] Can filter by health score, tier, churn risk
- [x] Can search clients by name
- [x] Can toggle between grid and list views
- [x] Can drill into client details via tabs
- [x] Health history shows trend chart with date range selector
- [x] Can toggle component scores on health chart
- [x] Touchpoints display chronological timeline
- [x] Can filter touchpoints by type
- [x] Can log new touchpoints via modal
- [x] Contract card shows expiration warning if < 30 days
- [x] Churn warnings displayed with contributing factors
- [x] All UI states demonstrable with seed data

### Implementation Notes

- Client list uses React Query for data fetching
- Filter state managed with useState (could move to URL params later)
- HealthHistoryChart uses Recharts with reference lines for thresholds
- TouchpointTimeline groups entries by date
- LogTouchpointModal uses react-hook-form pattern
- Seed data includes diverse scenarios: critical health, high churn, expiring contracts
- Helper function `assign_all_clients_to_user()` for dev setup

---

## Phase 4: AI Integration ✅ COMPLETE

**Goal:** AI-powered analysis and drafting

**Status:** Complete (November 2024)

### Tasks

1. ✅ Create AI API routes with Vercel AI SDK + Gemini
2. ✅ Implement constraint enforcement middleware
3. ✅ Build "The Lawyer" guardrail (FR-B1)
4. ✅ Create draft generation UI
5. ✅ Implement SERP Shapeshifter (FR-C2)
6. ✅ Add data threshold validation (Constraint 6)

### Files Created

```
src/app/api/ai/chat/route.ts              # General AI chat with streaming
src/app/api/ai/draft/route.ts             # Client communication drafts with scope enforcement
src/app/api/ai/analyze/route.ts           # Analysis endpoint with constraint checks
src/lib/ai/middleware.ts                  # Constraint enforcement & rate limiting
src/lib/ai/logger.ts                      # AI interaction logging utilities
src/components/shared/AIChatPanel.tsx     # Floating chat interface
src/components/shared/AIDraftPanel.tsx    # Draft generation UI with scope checking
src/components/shared/ScopeWarning.tsx    # Scope violation alert ("The Lawyer")
src/components/shared/AIConstraintWarnings.tsx # Constraint warning display
src/components/shared/FloatingAIChat.tsx  # Global floating chat wrapper
src/components/clients/SERPShapeshifter.tsx # SERP analysis tool
src/lib/mocks/serpData.ts                 # Mock SERP data for demo
src/app/(dashboard)/clients/[clientId]/serp/page.tsx # SERP analysis page
```

### Acceptance Criteria

- [x] AI responses include all required constraint warnings
- [x] Scope violations flagged before sending to client ("The Lawyer")
- [x] Data freshness warnings appear for stale data (>12h)
- [x] Churn warnings prepended when probability > 0.65
- [x] Statistical rigor warnings for experiments
- [x] All AI interactions logged to `ai_interaction_logs`
- [x] Streaming chat responses work correctly
- [x] AIChatPanel opens and streams responses
- [x] AIDraftPanel generates drafts with scope checking
- [x] ScopeWarning component displays violations clearly
- [x] SERP Shapeshifter shows mock competitive analysis
- [x] Client pages have AI integration buttons
- [x] Rate limiting prevents abuse (30 req/min)
- [x] Floating AI chat available globally

### Implementation Notes

- Uses Vercel AI SDK with `@ai-sdk/google` package
- Model: `gemini-2.0-flash` (configurable to gemini-3-pro-preview)
- All 10 AI constraints from `system-prompts.ts` are enforced
- Context building uses existing functions from `constraints.ts`
- Client context includes entitlements, churn prediction, calendar events
- SERP Shapeshifter uses mock data for MVP (Serper.dev integration in future)
- In-memory rate limiting with 60-second windows

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
**Phases Complete:** 4 of 9
**Files Created:** ~105 files

### Progress Overview

| Phase | Status | Description |
|-------|--------|-------------|
| Foundation | ✅ Complete | Database, types, AI constraints, UI components |
| Phase 1 | ✅ Complete | Authentication & Dashboard Layout |
| Phase 2 | ✅ Complete | Morning Briefing & Triage |
| Phase 3 | ✅ Complete | Client Management |
| Phase 4 | ✅ Complete | AI Integration |
| Phase 5 | 🔲 Not Started | GSC Integration |
| Phase 6 | 🔲 Not Started | Background Jobs |
| Phase 7 | 🔲 Not Started | Experiments & Knowledge |
| Phase 8 | 🔲 Not Started | Reports & Portal |
| Phase 9 | 🔲 Not Started | Advanced Features |

**Next Step:** Begin Phase 5 - GSC Integration
