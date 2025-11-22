# 🏗️ Company Intelligence Podcast Platform - Architecture Overview

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOCAL DEVELOPMENT ENVIRONMENT                      │
│                         (Your Machine / Development)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js Development Server                        │   │
│  │                    (localhost:3000)                                 │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │  Frontend (React/Next.js App Router)                         │  │   │
│  │  │  - /podcasts, /podcasts/new, /admin, etc.                    │  │   │
│  │  │  - Spotify-inspired dark theme UI                            │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │  Next.js API Routes (src/app/api/*)                          │  │   │
│  │  │  - /api/podcasts (GET/POST) - Direct DynamoDB access         │  │   │
│  │  │  - /api/podcasts/[id]/runs (POST) - Triggers pipeline        │  │   │
│  │  │  - /api/pipeline/execute-stage - Test individual stages      │  │   │
│  │  │  - /api/competitors/suggest - AI suggestions                 │  │   │
│  │  │  - /api/voice/preview - TTS preview                          │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CLI Tools & Scripts                              │   │
│  │  - npm run run-stage -- --stage <stage>                             │   │
│  │  - scripts/runStage.ts - Execute individual pipeline stages        │   │
│  │  - scripts/generateCassette.ts - Record API responses            │   │
│  │  - Can run locally with replay/stub/openai providers              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Pipeline Engine (Local)                           │   │
│  │  src/engine/orchestrator.ts - Full pipeline orchestration          │   │
│  │  src/engine/stages/*.ts - 13 pipeline stages                      │   │
│  │  - Can execute entire pipeline locally                             │   │
│  │  - Uses gateway pattern (LLM, TTS, HTTP)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / AWS SDK
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS CLOUD (Production)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    API Gateway (HTTP API)                           │   │
│  │  - RESTful endpoints                                                │   │
│  │  - JWT authentication via Cognito                                  │   │
│  │  - CORS enabled                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AWS LAMBDA FUNCTIONS                             │   │
│  │                    (7 Functions Deployed)                           │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │  API Lambdas (src/api/*)                                    │  │   │
│  │  │  1. podcasts/create.ts    - Create podcast                   │  │   │
│  │  │  2. podcasts/list.ts      - List user podcasts               │  │   │
│  │  │  3. competitors/suggest.ts - AI competitor suggestions      │  │   │
│  │  │  4. episodes/get.ts       - Get episode with S3 URLs         │  │   │
│  │  │  5. runs/create.ts        - Start pipeline execution         │  │   │
│  │  │  6. runs/events.ts        - Real-time progress tracking      │  │   │
│  │  │  7. voice/preview.ts      - TTS voice preview                │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │  Pipeline Stage Lambdas (Planned, not yet deployed)        │  │   │
│  │  │  - prepare, discover, extract, summarize, contrast,         │  │   │
│  │  │    outline, script, tts, package, handleFailure           │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    STEP FUNCTIONS (State Machine)                    │   │
│  │                    podcast-pipeline                                  │   │
│  │                                                                       │   │
│  │  Orchestrates 13 pipeline stages:                                    │   │
│  │  1. Prepare → 2. Discover → 3. Scrape (ECS) → 4. Extract →          │   │
│  │  5. Summarize + Contrast (parallel) → 6. Outline →                 │   │
│  │  7. Script → 8. TTS → 9. Package                                   │   │
│  │                                                                       │   │
│  │  - Invokes Lambda functions for most stages                          │   │
│  │  - Invokes ECS Fargate tasks for scraping                           │   │
│  │  - Handles retries, error handling, parallel execution              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ECS FARGATE (Container Tasks)                    │   │
│  │                    podcast-platform-cluster                         │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │  Scraper Container                                           │  │   │
│  │  │  - Node.js + TypeScript + Playwright                         │  │   │
│  │  │  - Runs in private VPC subnets                               │  │   │
│  │  │  - Respects robots.txt                                       │  │   │
│  │  │  - Per-domain rate limiting                                  │  │   │
│  │  │  - Invoked by Step Functions                                 │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │  LLM Worker Container (Planned)                              │  │   │
│  │  │  - For heavy AI processing tasks                             │  │   │
│  │  │  - Embeddings, ranking, clustering                            │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DYNAMODB (NoSQL Database)                        │   │
│  │                                                                       │   │
│  │  Tables:                                                             │   │
│  │  - podcasts (PK: id, GSI: OrgIdIndex)                              │   │
│  │  - podcast_configs (PK: podcastId, SK: version)                      │   │
│  │  - podcast_competitors (PK: podcastId, SK: companyId)              │   │
│  │  - podcast_topics (PK: podcastId, SK: topicId)                      │   │
│  │  - runs (PK: id, GSI: PodcastIdIndex)                               │   │
│  │  - run_events (PK: id, SK: ts, GSI: RunIdIndex)                     │   │
│  │  - episodes (PK: id, GSI: PodcastIdIndex)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    S3 BUCKETS (Object Storage)                        │   │
│  │                                                                       │   │
│  │  - podcast-platform-media-{account}                                 │   │
│  │    • Audio files (MP3)                                               │   │
│  │    • Transcripts                                                     │   │
│  │    • Show notes                                                      │   │
│  │    • Private (presigned URLs)                                        │   │
│  │                                                                       │   │
│  │  - podcast-platform-rss-{account}                                   │   │
│  │    • RSS feed XML files                                              │   │
│  │    • Public read access                                              │   │
│  │                                                                       │   │
│  │  - podcast-platform-frontend-{account}                              │   │
│  │    • Next.js static export                                           │   │
│  │    • Served via CloudFront                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CLOUDFRONT (CDN)                                   │   │
│  │                                                                       │   │
│  │  - Frontend distribution (dhycfwg0k4xij.cloudfront.net)               │   │
│  │  - Media files (/media/*)                                            │   │
│  │  - RSS feeds (/rss/*)                                                │   │
│  │  - Global edge locations                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    COGNITO (Authentication)                          │   │
│  │                                                                       │   │
│  │  - User Pool: podcast-platform-users                                  │   │
│  │  - User authentication & authorization                               │   │
│  │  - JWT tokens for API access                                         │   │
│  │  - Multi-tenant support (org_id)                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SECRETS MANAGER                                  │   │
│  │                                                                       │   │
│  │  - Stores OpenAI API keys                                            │   │
│  │  - Encrypted at rest                                                 │   │
│  │  - Accessed by Lambda functions                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    VPC (Networking)                                  │   │
│  │                                                                       │   │
│  │  - Private subnets for ECS tasks                                     │   │
│  │  - NAT Gateway for outbound internet                                 │   │
│  │  - Security groups for network isolation                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    OPENAI API                                        │   │
│  │  - GPT-4 for LLM tasks (discover, extract, summarize, script)       │   │
│  │  - TTS-1-HD for text-to-speech                                       │   │
│  │  - Used by Lambda functions and local CLI                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NEWS SOURCES (HTTP)                              │   │
│  │  - Google News RSS feeds                                            │   │
│  │  - Company IR pages                                                 │   │
│  │  - Regulatory filings                                                │   │
│  │  - Scraped by Playwright (ECS or local)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 🖥️ **LOCAL ENVIRONMENT**

#### **Next.js Development Server** (`localhost:3000`)
- **Frontend**: React components, pages, UI
- **Next.js API Routes**: Development/testing endpoints
  - `/api/podcasts` - Direct DynamoDB access (dev mode)
  - `/api/podcasts/[id]/runs` - Triggers pipeline (can run locally or on AWS)
  - `/api/pipeline/execute-stage` - Test individual stages
- **Status**: ✅ Fully functional for development

#### **CLI Tools & Scripts**
- `npm run run-stage` - Execute individual pipeline stages locally
- `scripts/runStage.ts` - Stage execution script
- `scripts/generateCassette.ts` - Record API responses for replay mode
- **Status**: ✅ Working, can run with replay/stub/openai providers

#### **Pipeline Engine (Local)**
- `src/engine/orchestrator.ts` - Full pipeline orchestration
- `src/engine/stages/*.ts` - 13 pipeline stages
- Can execute entire pipeline locally
- Uses gateway pattern (LLM, TTS, HTTP providers)
- **Status**: ✅ Fully implemented, can run locally

---

### ☁️ **AWS CLOUD (Production)**

#### **API Gateway (HTTP API)**
- RESTful endpoints
- JWT authentication via Cognito
- CORS enabled
- Routes to Lambda functions
- **Status**: ✅ Deployed

#### **AWS Lambda Functions** (7 deployed)
**Location**: `src/api/*.ts`

1. **podcasts/create.ts** - Create podcast with multi-table writes
2. **podcasts/list.ts** - List user's podcasts (org-filtered)
3. **competitors/suggest.ts** - AI competitor suggestions (OpenAI GPT-4)
4. **episodes/get.ts** - Get episode with presigned S3 URLs
5. **runs/create.ts** - Start Step Functions pipeline execution
6. **runs/events.ts** - Real-time run progress tracking
7. **voice/preview.ts** - TTS voice preview (OpenAI)

**Status**: ✅ All 7 functions deployed and tested

**Planned (not yet deployed)**:
- Pipeline stage Lambdas (prepare, discover, extract, summarize, etc.)

#### **Step Functions (State Machine)**
- **Name**: `podcast-pipeline`
- Orchestrates 13 pipeline stages
- Invokes Lambda functions for most stages
- Invokes ECS Fargate tasks for scraping
- Handles retries, error handling, parallel execution
- **Status**: ✅ Deployed, ready to use

#### **ECS Fargate (Container Tasks)**
- **Cluster**: `podcast-platform-cluster`
- **Scraper Container**: Node.js + TypeScript + Playwright
  - Runs in private VPC subnets
  - Respects robots.txt
  - Per-domain rate limiting
  - Invoked by Step Functions
- **Status**: ✅ Infrastructure ready, tasks can be invoked

#### **DynamoDB Tables** (7 tables)
1. `podcasts` - Main podcast records
2. `podcast_configs` - Podcast configuration versions
3. `podcast_competitors` - Competitor associations
4. `podcast_topics` - Topic associations
5. `runs` - Pipeline execution records
6. `run_events` - Real-time event stream
7. `episodes` - Generated episode records

**Status**: ✅ All tables created

#### **S3 Buckets** (3 buckets)
1. `podcast-platform-media-{account}` - Audio, transcripts, show notes (private)
2. `podcast-platform-rss-{account}` - RSS feed XML (public)
3. `podcast-platform-frontend-{account}` - Next.js static export

**Status**: ✅ All buckets created

#### **CloudFront (CDN)**
- Frontend distribution
- Media file delivery
- RSS feed distribution
- **URL**: `https://dhycfwg0k4xij.cloudfront.net`
- **Status**: ✅ Deployed

#### **Cognito (Authentication)**
- User Pool: `podcast-platform-users`
- JWT token generation
- Multi-tenant support (org_id)
- **Status**: ✅ Deployed

#### **Secrets Manager**
- Stores OpenAI API keys
- Encrypted at rest
- **Status**: ✅ Available (needs configuration)

#### **VPC (Networking)**
- Private subnets for ECS
- NAT Gateway for outbound internet
- Security groups
- **Status**: ✅ Created

---

### 🌐 **EXTERNAL SERVICES**

#### **OpenAI API**
- GPT-4 for LLM tasks
- TTS-1-HD for text-to-speech
- Used by Lambda functions and local CLI
- **Status**: ✅ Integrated

#### **News Sources (HTTP)**
- Google News RSS feeds
- Company IR pages
- Regulatory filings
- Scraped by Playwright
- **Status**: ✅ Integrated

---

## Data Flow Examples

### **Example 1: Create Podcast (Local Dev)**
```
User → Next.js UI (localhost:3000)
     → /api/podcasts (Next.js API Route)
     → DynamoDB (direct connection)
     → Response
```

### **Example 2: Create Podcast (Production)**
```
User → CloudFront → Next.js Frontend
     → API Gateway
     → Lambda: podcasts/create
     → DynamoDB (podcasts, configs, competitors, topics tables)
     → Response
```

### **Example 3: Run Pipeline (Local)**
```
User → Next.js UI → /api/podcasts/[id]/runs
     → executePipeline() (local function)
     → PipelineOrchestrator (runs locally)
     → Stage 1: Prepare (local)
     → Stage 2: Discover (local, uses OpenAI or replay)
     → Stage 3: Scrape (local, uses Playwright or replay)
     → ... (all stages run locally)
     → Results saved to output/ directory
```

### **Example 4: Run Pipeline (Production)**
```
User → Next.js UI → /api/podcasts/[id]/runs
     → Lambda: runs/create
     → Step Functions: Start execution
     → Step 1: Prepare (Lambda)
     → Step 2: Discover (Lambda)
     → Step 3: Scrape (ECS Fargate task)
     → Step 4: Extract (Lambda)
     → Step 5: Summarize + Contrast (parallel Lambdas)
     → Step 6: Outline (Lambda)
     → Step 7: Script (Lambda)
     → Step 8: TTS (Lambda)
     → Step 9: Package (Lambda)
     → Results saved to S3 + DynamoDB
     → Events streamed to run_events table
```

---

## Key Architectural Decisions

1. **Hybrid Local/Cloud**: Can run entirely locally for development, or use AWS for production
2. **Gateway Pattern**: Abstracted providers (LLM, TTS, HTTP) allow switching between real/mock/replay
3. **Step Functions Orchestration**: Serverless orchestration for production pipeline
4. **ECS for Scraping**: Long-running scraping tasks run in containers (not Lambda)
5. **Multi-tenant**: Org-level isolation via `org_id` in all tables
6. **Event-Driven**: Real-time progress via DynamoDB events table
7. **CDN Distribution**: CloudFront for global content delivery

---

## Current Deployment Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Local Dev Server** | ✅ Working | `npm run dev` |
| **Next.js API Routes** | ✅ Working | Development endpoints |
| **CLI Tools** | ✅ Working | Can run stages locally |
| **Pipeline Engine** | ✅ Working | Can run locally |
| **API Gateway** | ✅ Deployed | |
| **Lambda Functions (7)** | ✅ Deployed | All tested |
| **Step Functions** | ✅ Deployed | Ready to use |
| **ECS Cluster** | ✅ Created | Tasks can be invoked |
| **DynamoDB Tables** | ✅ Created | All 7 tables exist |
| **S3 Buckets** | ✅ Created | All 3 buckets exist |
| **CloudFront** | ✅ Deployed | Frontend live |
| **Cognito** | ✅ Deployed | Auth working |
| **Pipeline Stage Lambdas** | ⚠️ Planned | Not yet deployed |

---

**Last Updated**: 2025-01-17  
**Architecture Version**: 1.0

