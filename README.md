# Stratosphere: Forensics Console

**"Strategy from above."**

Stratosphere is a Forensic Intelligence Sidecar for Senior Ranking Strategists. It reduces "Investigation Time" for SEO support tickets from 30 minutes to 30 seconds by automating data collection (Forensics) and enforcing agency protocols (The Ranking 2.0 Handbook) via AI.

## Features

- **Ticket Analysis**: Paste AM tickets and get AI-powered root cause analysis
- **Live SERP Verification**: Check ranking claims in real-time via Serper.dev
- **Algorithm Correlation**: Overlay traffic changes against Google algorithm updates
- **Handbook Enforcement**: AI respects the 9-Month Rule, Queue System, and Mapping rules
- **Persona-Based Responses**: Draft emails tailored to AM personality types

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components)
- **Database**: Supabase (PostgreSQL + RLS)
- **AI**: Vercel AI SDK + Google Gemini 2.0 Flash
- **SERP API**: Serper.dev
- **Styling**: Tailwind CSS + shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google AI API key (Gemini)
- Serper.dev API key

### Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key

# Serper.dev
SERPER_API_KEY=your-serper-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the Forensics Console.

## Handbook Constraints (Ranking 2.0)

The AI enforces these agency rules:

1. **9-Month Rule**: Never optimize pages created <6 months ago or optimized <9 months ago
2. **The Queue**: All content work is scheduled 3 months out
3. **Mapping Rule**: Generic pages ranking for geo queries must be unmapped

### Allowed Strategies

| Strategy | Use Case |
|----------|----------|
| Mini-Homepage | Multi-location issues |
| Areas We Serve Build | Missing geo-pages |
| Content Refresh | Only if 9-month rule passed |
| Digital PR | When page is 9-month locked |
| Web Health Fix | Technical failures (404s, Schema) |
| Unmap and Create | Generic page ranking for geo query |

## AM Personas

The AI tailors response tone based on AM type:

- **Panic Patty**: Reassuring, data-heavy responses
- **Technical Tom**: Detailed root cause analysis
- **Ghost Gary**: Brief, action-focused bullets

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, onboarding
│   ├── (dashboard)/      # Main Forensics Console
│   └── api/
│       └── ai/           # analyze-ticket endpoint
├── components/
│   ├── forensics/        # Ticket analysis UI
│   ├── dashboard/        # Layout components
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── ai/               # Prompts, constraints
│   ├── forensics/        # Analysis modules
│   └── serper/           # SERP API client
└── types/
```

## API Endpoints

### POST `/api/ai/analyze-ticket`

Analyze a support ticket and generate strategic recommendations.

**Request:**
```json
{
  "ticketBody": "Client says they're not ranking...",
  "targetDomain": "example.com",
  "amPersona": "PANIC_PATTY",
  "targetQuery": "plumber near me",
  "location": "Austin, Texas"
}
```

**Response:**
```json
{
  "verdict": "FALSE_ALARM",
  "rootCause": "Client is ranking at position 4...",
  "strategy": null,
  "evidence": ["SERP check shows position 4"],
  "confidence": 0.85,
  "draftEmail": "Hi [Name], I've looked into this...",
  "forensicData": { ... },
  "warnings": []
}
```

## Development

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

## License

Proprietary - Scorpion internal use only.
