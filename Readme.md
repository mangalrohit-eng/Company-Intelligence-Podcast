# AI Podcast Platform

Generate intelligent, company-focused podcasts powered by AI. Stay ahead with competitor insights and industry trends.

## Features

- 🎙️ **AI-Powered Scripts**: Automatically generate engaging scripts from latest industry news
- 📊 **Competitor Analysis**: Track competitors and get strategic insights in every episode
- 🌍 **Multi-Source Intelligence**: Aggregate news from trusted sources worldwide
- 🚀 **One-Click Publishing**: Generate audio, publish to RSS, distribute to all major platforms
- 🔄 **Flag-Driven Pipeline**: Toggle stages and providers for flexible execution
- 💰 **Cost-Effective Testing**: Record/replay mode for zero-cost development

## Quick Start

### Prerequisites

**For Local Development (Replay Mode):**
- ✅ Node.js 18+
- ✅ npm or pnpm
- ❌ **No API keys or AWS needed!**

**For OpenAI Integration:**
- ✅ Above prerequisites
- ✅ OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

**For AWS Deployment:**
- ✅ Above prerequisites
- ✅ AWS Account ([Sign up](https://aws.amazon.com/))
- ✅ AWS CLI ([Install guide](https://aws.amazon.com/cli/))

### Installation

```bash
# Install dependencies
npm install

# Start development server (frontend)
npm run dev
```

**That's it!** No configuration needed for replay mode.

**For OpenAI/AWS setup:** See [SETUP.md](./SETUP.md) for complete guide.

### Running the Pipeline

**Option 1: No Credentials (Free) ✅**
```bash
# Uses recorded API responses - NO API KEY NEEDED!
npm run run-stage -- --stage summarize --in fixtures/summarize/in.json --out output.json --llm replay --tts stub
```

**Option 2: With OpenAI (Requires API Key) 💰**
```bash
# 1. Get API key from https://platform.openai.com/api-keys
# 2. Add to .env: OPENAI_API_KEY=sk-proj-xxxxx
# 3. Run with real AI:
npm run run-stage -- --stage summarize --in fixtures/summarize/in.json --out output.json --llm openai --tts openai
```

**Option 3: Full AWS Deployment (Requires AWS Account) 🚀**
```bash
# See SETUP.md for complete AWS deployment guide
npm run deploy
```

## Architecture

### Backend (AWS)

- **API**: Lambda + API Gateway
- **Auth**: Cognito
- **Database**: DynamoDB
- **Orchestration**: Step Functions
- **Compute**: ECS Fargate (scrapers), Lambda (processing)
- **Storage**: S3 + CloudFront
- **Intelligence**: OpenAI GPT-4 + TTS

### Frontend (Next.js)

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS (Spotify-inspired dark theme)
- **State**: React hooks
- **Auth**: Cognito integration

## Development Pattern

This repo follows a **flag-driven, record/replay pipeline** pattern.

- Each stage (discover, scrape, summarize, script, tts, etc.) can be toggled via `RunFlags.enable.<stage>`.
- Providers (`llm`, `tts`, `http`) can be `openai`, `replay`, or `stub`.
- Record real API responses once into `/cassettes/<cassetteKey>/` and replay later for free.
- Run individual stages with `scripts/runStage.ts` or use Cursor commands:
  - **run-summarize-replay**
  - **run-script-stub**
  - **run-e2e-dry**
- Default mode: replay/stub (no cost). Switch to `openai` only when needed.

## Project Structure

```
├── src/
│   ├── api/                 # Lambda API handlers
│   ├── app/                 # Next.js pages (App Router)
│   ├── engine/              # Pipeline stages
│   │   └── stages/          # Individual stage implementations
│   ├── gateways/            # Provider interfaces (LLM, TTS, HTTP)
│   ├── types/               # TypeScript types
│   └── utils/               # Shared utilities
├── infra/
│   ├── cdk/                 # AWS CDK infrastructure
│   └── stepfunctions/       # State machine definitions
├── scripts/                 # Utility scripts
├── fixtures/                # Test input/output data
├── cassettes/               # Recorded API responses
└── tests/                   # Test suites
```

## Key Concepts

### Run Flags

Control pipeline execution with flags:

```typescript
{
  dryRun: false,
  provider: {
    llm: 'replay',    // openai | replay | stub
    tts: 'stub',      // openai | stub
    http: 'replay'    // openai (playwright) | replay
  },
  enable: {
    discover: true,
    scrape: true,
    extract: true,
    summarize: true,
    // ... other stages
  }
}
```

### Pipeline Stages

1. **Prepare**: Calculate budgets and targets
2. **Discover**: Find news sources via RSS/APIs
3. **Disambiguate**: Entity linking and filtering
4. **Rank**: Compute expected information gain
5. **Scrape**: Fetch and extract content
6. **Extract**: Identify stats, quotes, claims
7. **Summarize**: Generate topic summaries
8. **Contrast**: Compare company vs competitors
9. **Outline**: Create thematic outline
10. **Script**: Generate narrative
11. **QA**: Bind evidence and validate
12. **TTS**: Render audio
13. **Package**: Create episode artifacts

## Deployment

```bash
# Deploy infrastructure
cd infra/cdk
pnpm cdk deploy

# Deploy frontend (Vercel/AWS Amplify)
pnpm build
# Follow platform-specific deployment
```

## Testing

### Unit Tests

We have comprehensive test coverage for all 13 pipeline stages:

```bash
# Run all tests
npm test

# Run tests for specific stage
npm test -- prepare.test.ts

# Run tests with coverage
npm test -- --coverage

# List all test files
npm test -- --listTests
```

**Test Coverage**:
- ✅ **95 tests** across 13 pipeline stages
- ✅ **Stage 1 (Prepare)**: Budget calculations, config freezing
- ✅ **Stage 2 (Discover)**: RSS/News APIs, pre-classification
- ✅ **Stage 3 (Disambiguate)**: Confidence threshold (≥0.85), allow/block lists
- ✅ **Stage 4 (Rank)**: R,F,A,D,S,C factors, priority queues
- ✅ **Stage 5 (Scrape)**: Stop conditions, telemetry
- ✅ **Stage 6 (Extract)**: ≤10-word quotes, deduplication
- ✅ **Stage 7 (Summarize)**: 1 stat + 1 quote per topic, [CHECK] markers
- ✅ **Stage 8 (Contrast)**: Competitor contrasts with evidence
- ✅ **Stage 9 (Outline)**: Knowledge graph, 5-section outline
- ✅ **Stage 10 (Script)**: ~150 wpm scaling, bridges
- ✅ **Stage 11 (QA)**: [CHECK] resolution, evidence binding
- ✅ **Stage 12 (TTS)**: Duration validation (±10%), voice/speed
- ✅ **Stage 13 (Package)**: Show notes, transcripts, RSS

See **[TEST_REPORT.md](TEST_REPORT.md)** for detailed test results.

### Other Checks

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format
```

## Contributing

1. Follow the established patterns (flag-driven, dependency injection)
2. Add tests for new stages
3. Update fixtures when changing interfaces
4. Record cassettes for integration tests

## License

Proprietary - All rights reserved
