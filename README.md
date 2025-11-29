# Stratosphere

An enterprise-grade SEO dashboard and account management platform designed to transform how SEO strategists manage high-stakes client relationships, perform forensic audits, and execute operational workflows.

**Core Philosophy: "Code does the Math; AI does the Reasoning"** - All quantitative analysis is pre-computed before being passed to AI systems, ensuring accuracy and consistency.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
- [Development](#development)
- [Architecture](#architecture)
  - [AI System](#ai-system)
  - [GSC Integration](#gsc-integration)
  - [Authentication](#authentication)
- [API Reference](#api-reference)
- [Deployment](#deployment)

## Overview

Stratosphere provides a "God Mode" dashboard for SEO account managers, integrating Google Search Console data with AI-powered insights. The platform enables:

- Automated alert triage and client health monitoring
- AI-assisted decision-making with predefined constraints
- Client churn risk tracking and operational velocity measurement
- Client touchpoint and contract management
- Real-time GSC analytics with intelligent caching

## Features

### Dashboard and Navigation
- Morning briefing generation with AI-powered summaries
- Client health overview with risk indicators
- Alert triage interface with severity levels (CRITICAL, WARNING, INFO)
- Sidebar navigation with filterable client list
- Global search functionality

### Client Management
- Comprehensive client profiles with health history
- Churn risk indicators and prediction scores
- Contract tracking with renewal alerts
- Service tier entitlements management
- Client touchpoint logging and timeline

### AI Assistant
- Streaming chat interface with multi-turn conversations
- Conversation persistence and search
- Multiple interaction modes:
  - **Briefing**: Executive summaries
  - **Alert Triage**: Incident response guidance
  - **Draft**: Client communication assistance
  - **Analysis**: Deep-dive investigations
  - **Report**: Formal reporting generation
- 10 mandatory constraint rules for consistent, accurate responses

### Google Search Console Integration
- OAuth 2.0 authentication flow
- Cache-first data fetching with 24-hour default TTL
- Rate limiting with exponential backoff
- Quota tracking per client
- Analytics dashboards:
  - Overview metrics (clicks, impressions, CTR, position)
  - Time series visualizations
  - Top queries analysis
  - Top pages performance

### Alert System
- Severity-based categorization
- Dismissal workflow with context capture
- Auto-expiration support
- Triage queue management

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework with App Router |
| React | 19.x | UI library |
| Tailwind CSS | 4.x | Styling framework |
| shadcn/ui | - | Component library (24 components) |
| Radix UI | - | Unstyled component primitives |
| Zustand | 5.x | State management |
| TanStack Query | 5.x | Data fetching and caching |
| Recharts | 3.x | Chart visualizations |
| React Hook Form | 7.x | Form management |
| Zod | 4.x | Schema validation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | - | Server endpoints |
| Supabase | - | PostgreSQL database with RLS |
| Supabase Auth | - | Authentication (Magic Links + OAuth) |
| Inngest | 3.x | Background job queue |

### AI and Integrations
| Technology | Version | Purpose |
|------------|---------|---------|
| Vercel AI SDK | 5.x | AI streaming infrastructure |
| Google Gemini | 2.0 Flash | LLM for AI features |
| Google Search Console API | v3 | SEO analytics data |

## Project Structure

```
stratosphere/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Authentication routes
│   │   │   ├── login/                # Login page
│   │   │   ├── onboarding/           # User onboarding
│   │   │   └── callback/             # OAuth callback
│   │   │
│   │   ├── (dashboard)/              # Protected dashboard routes
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── clients/              # Client management
│   │   │   │   └── [clientId]/       # Individual client pages
│   │   │   │       ├── health/       # Health history
│   │   │   │       ├── gsc/          # GSC analytics
│   │   │   │       ├── serp/         # SERP analysis
│   │   │   │       └── touchpoints/  # Client interactions
│   │   │   └── triage/               # Alert triage queue
│   │   │
│   │   └── api/                      # API Routes
│   │       ├── ai/                   # AI endpoints
│   │       │   ├── chat/             # Streaming chat
│   │       │   ├── analyze/          # Analysis requests
│   │       │   ├── draft/            # Draft generation
│   │       │   └── conversations/    # Conversation CRUD
│   │       │
│   │       └── gsc/                  # GSC endpoints
│   │           ├── analytics/        # Data fetching
│   │           ├── status/           # Connection status
│   │           ├── refresh/          # Cache refresh
│   │           └── oauth/            # OAuth flow
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── dashboard/                # Dashboard components
│   │   ├── clients/                  # Client-specific components
│   │   ├── providers/                # React providers
│   │   └── shared/                   # Shared components
│   │
│   ├── lib/
│   │   ├── ai/                       # AI system
│   │   │   ├── constraints.ts        # Mandatory AI constraints
│   │   │   ├── logger.ts             # AI interaction logging
│   │   │   ├── middleware.ts         # Auth and context
│   │   │   └── system-prompts.ts     # System prompts by type
│   │   │
│   │   ├── gsc/                      # GSC integration
│   │   │   ├── client.ts             # API client
│   │   │   ├── cache.ts              # Cache-first logic
│   │   │   ├── mock.ts               # Mock data
│   │   │   ├── oauth.ts              # OAuth flow
│   │   │   └── rateLimit.ts          # Rate limiting
│   │   │
│   │   ├── supabase/                 # Database clients
│   │   ├── hooks/                    # React hooks
│   │   └── utils/                    # Utility functions
│   │
│   ├── stores/                       # Zustand stores
│   └── types/                        # TypeScript types
│
├── supabase/
│   └── migrations/                   # Database migrations
│
├── docs/                             # Documentation
│   ├── STRATOSPHERE-SRS-v6.0.md      # Full specification
│   └── IMPLEMENTATION-ROADMAP.md     # Development roadmap
│
└── public/                           # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, pnpm, or bun
- Supabase account and project
- Google Cloud Console project (for GSC integration)
- Google AI Studio API key (for Gemini)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stratosphere
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp .env.example .env.local
```

4. Configure environment variables (see below)

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase (Required)
# Get these from your Supabase project settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google AI - Gemini (Required for AI features)
# Get from: https://aistudio.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key-here

# Google Search Console (Optional - uses mock data by default)
# Set up OAuth 2.0 at: https://console.cloud.google.com/apis/credentials
GSC_CLIENT_ID=your-gsc-client-id.apps.googleusercontent.com
GSC_CLIENT_SECRET=your-gsc-client-secret
USE_MOCK_GSC=true  # Set to 'false' when real credentials are configured

# Inngest - Background Jobs (Optional)
# Get from: https://app.inngest.com
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the database migrations in order:
```sql
-- Run each migration file in supabase/migrations/
-- 001_initial_schema.sql - Base schema with RLS policies
-- 002_seed_data.sql - Initial test data
-- 003_expanded_seed_data.sql - Additional test data
```

3. Configure authentication providers in Supabase:
   - Enable Email (Magic Links)
   - Optionally enable Google OAuth

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Development with Mock Data

By default, the application runs with mock GSC data (`USE_MOCK_GSC=true`). This allows full development without setting up Google Search Console credentials. The mock data provides realistic synthetic data for testing all features.

### Type Checking

The project uses TypeScript with strict mode. Database types are defined in `src/types/database.ts` and should be regenerated when the schema changes.

## Architecture

### AI System

The AI system follows the "Code does the Math; AI does the Reasoning" principle:

1. **Pre-computation**: All metrics, deltas, and calculations are performed in TypeScript before reaching the AI
2. **System Prompts**: Different prompts for different interaction types (briefing, triage, draft, analysis, report)
3. **Constraints**: 10 mandatory rules ensure consistent, accurate AI behavior:
   - No manual math calculations
   - Scope enforcement based on service tiers
   - Churn vigilance (alert on >65% risk)
   - Temporal context awareness
   - Entitlement verification
   - Output validation
   - Data freshness checks
   - Token estimation
   - Latency monitoring
   - Compliance logging

4. **Streaming**: Responses are streamed to the UI using Vercel AI SDK
5. **Persistence**: Conversations and messages are stored in the database

Key files:
- `src/lib/ai/system-prompts.ts` - System prompts
- `src/lib/ai/constraints.ts` - Constraint definitions
- `src/app/api/ai/chat/route.ts` - Chat endpoint

### GSC Integration

The Google Search Console integration uses a cache-first architecture:

1. **OAuth Flow**: Secure token exchange and storage
2. **Cache Layer**: 24-hour default TTL with freshness indicators
3. **Rate Limiting**: Exponential backoff with quota tracking
4. **Mock Mode**: Realistic synthetic data for development

Data flow:
```
Request -> Check Cache -> If Fresh: Return Cached
                       -> If Stale: Fetch API -> Update Cache -> Return
```

Key files:
- `src/lib/gsc/client.ts` - API client
- `src/lib/gsc/cache.ts` - Caching logic
- `src/lib/gsc/rateLimit.ts` - Rate limiting

### Authentication

Authentication is handled by Supabase Auth with:

1. **Magic Links**: Passwordless email authentication
2. **Google OAuth**: Third-party authentication option
3. **Session Management**: Cookie-based sessions with automatic refresh
4. **Row-Level Security**: Database-level access control

User roles:
- `PRIMARY` - Full client access, can connect GSC
- `BACKUP` - Secondary contact
- `OBSERVER` - Read-only access
- `EXECUTIVE` - High-level reports only

Protected routes are enforced via Next.js middleware (`src/middleware.ts`).

## API Reference

### AI Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | Streaming chat responses |
| `/api/ai/analyze` | POST | Analysis requests |
| `/api/ai/draft` | POST | Draft generation |
| `/api/ai/conversations` | GET/POST | Conversation management |
| `/api/ai/conversations/[id]` | GET/DELETE | Individual conversation |
| `/api/ai/conversations/[id]/messages` | GET/POST | Conversation messages |

### GSC Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gsc/analytics` | GET | Fetch GSC analytics data |
| `/api/gsc/status` | GET | Check GSC connection status |
| `/api/gsc/refresh` | POST | Force cache refresh |
| `/api/gsc/oauth/connect` | GET | Initiate OAuth flow |
| `/api/gsc/oauth/callback` | GET | Handle OAuth callback |

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables in the Vercel dashboard
3. Deploy

### Other Platforms

The application can be deployed to any platform supporting Node.js:

```bash
npm run build
npm run start
```

Ensure all environment variables are configured in your deployment environment.

### Production Considerations

- Set `NODE_ENV=production`
- Configure `NEXT_PUBLIC_APP_URL` to your production domain
- Set `USE_MOCK_GSC=false` and configure real GSC credentials
- Enable Supabase production mode
- Configure Inngest for background jobs (optional)

## Database Schema

Key tables:

| Table | Description |
|-------|-------------|
| `user_profiles` | User preferences and settings |
| `user_client_assignments` | User-to-client role mappings |
| `clients` | Client information and GSC credentials |
| `client_contracts` | Contract details and renewal dates |
| `client_entitlements` | Service tier access rules |
| `client_health_history` | Daily health scores and metrics |
| `alerts` | System alerts with severity levels |
| `client_touchpoints` | Client interaction history |
| `ai_conversations` | AI chat conversations |
| `ai_messages` | Individual AI messages |
| `gsc_cache_logs` | Cached GSC API responses |
| `api_quota_tracking` | API usage quotas |

All tables are secured with Row-Level Security (RLS) policies.

## License

This project is proprietary software. All rights reserved.
