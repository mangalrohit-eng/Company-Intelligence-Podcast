# 📦 Single Container Contents - Complete Breakdown

## What's Inside the Container

The single container will contain **everything** needed to run your entire application. Here's the complete breakdown:

---

## 🎯 **Core Runtime**

### **1. Next.js Server** (Port 3000)
- **Next.js 14** with App Router
- **React 18** for UI rendering
- **Node.js 18** runtime
- **Production build** (optimized, minified)

**What it runs:**
- Frontend UI (all React pages)
- API routes (all `/api/*` endpoints)
- Server-side rendering (if needed)

---

## 🖥️ **Frontend (React/Next.js)**

### **Pages & UI Components**
```
✅ Landing page (/)
✅ Podcast list (/podcasts)
✅ Create podcast wizard (/podcasts/new)
✅ Podcast detail pages (/podcasts/[id])
✅ Episode pages (/podcasts/[id]/episodes/[episodeId])
✅ Run detail pages (/podcasts/[id]/runs/[runId])
✅ Admin console (/admin)
✅ Settings pages (/settings)
✅ Authentication pages (/auth/login, /auth/signup)
✅ Test pipeline page (/test-pipeline)
```

### **UI Components**
- Navigation, Layout, Cards, Buttons
- Forms, Inputs, Selects, Tabs
- Toast notifications
- Protected routes
- RSS validator

### **Styling**
- **Tailwind CSS** (Spotify-inspired dark theme)
- **PostCSS** for CSS processing
- **Radix UI** components

---

## 🔌 **API Routes (Next.js API)**

### **All API Endpoints** (`/api/*`)

#### **Podcast APIs**
- `GET /api/podcasts` - List all podcasts
- `POST /api/podcasts` - Create new podcast
- `GET /api/podcasts/[id]` - Get podcast details
- `POST /api/podcasts/[id]/runs` - Start pipeline execution
- `GET /api/podcasts/[id]/runs` - List runs for podcast
- `POST /api/podcasts/[id]/runs/[runId]/stop` - Stop pipeline
- `POST /api/podcasts/[id]/runs/[runId]/resume` - Resume pipeline

#### **Pipeline APIs**
- `POST /api/pipeline/execute-stage` - Execute individual stage
- `GET /api/health` - Health check endpoint

#### **Admin APIs**
- `GET /api/admin/settings` - Get admin settings
- `POST /api/admin/clear-podcasts` - Clear podcasts (admin)

#### **Utility APIs**
- `GET /api/competitors/suggest` - AI competitor suggestions
- `POST /api/voice/preview` - TTS voice preview
- `GET /api/serve-file/[...path]` - Serve output files

---

## ⚙️ **Pipeline Engine**

### **Pipeline Orchestrator**
- `src/engine/orchestrator.ts` - Main orchestrator class
- Executes all 13 stages in sequence
- Handles stage dependencies
- Manages telemetry and logging
- Saves results to S3/DynamoDB

### **All 13 Pipeline Stages**
1. **Prepare** (`src/engine/stages/prepare.ts`) - Calculate budgets
2. **Discover** (`src/engine/stages/discover.ts`) - Find news articles
3. **Disambiguate** (`src/engine/stages/disambiguate.ts`) - Filter relevant items
4. **Rank** (`src/engine/stages/rank.ts`) - Prioritize articles
5. **Scrape** (`src/engine/stages/scrape.ts`) - Scrape web content
6. **Extract** (`src/engine/stages/extract.ts`) - Extract evidence units
7. **Summarize** (`src/engine/stages/summarize.ts`) - Create topic summaries
8. **Contrast** (`src/engine/stages/contrast.ts`) - Competitor analysis
9. **Outline** (`src/engine/stages/outline.ts`) - Generate podcast outline
10. **Script** (`src/engine/stages/script.ts`) - Write podcast script
11. **QA** (`src/engine/stages/qa.ts`) - Quality assurance
12. **TTS** (`src/engine/stages/tts.ts`) - Text-to-speech generation
13. **Package** (`src/engine/stages/package.ts`) - Final packaging

---

## 🔗 **Gateway Layer**

### **LLM Gateways** (AI Integration)
- `src/gateways/llm/openai.ts` - OpenAI GPT-4 integration
- `src/gateways/llm/replay.ts` - Replay recorded responses
- `src/gateways/llm/stub.ts` - Mock responses

### **TTS Gateways** (Text-to-Speech)
- `src/gateways/tts/openai.ts` - OpenAI TTS integration
- `src/gateways/tts/stub.ts` - Mock audio

### **HTTP Gateways** (Web Scraping)
- `src/gateways/http/playwright.ts` - Playwright browser scraping
- `src/gateways/http/node-fetch.ts` - Simple HTTP requests
- `src/gateways/http/replay.ts` - Replay recorded responses

### **Gateway Factory**
- `src/gateways/factory.ts` - Creates gateways based on config

---

## 🛠️ **Utilities & Helpers**

### **Authentication**
- `src/utils/auth-helper.ts` - Cognito authentication helpers
- `src/utils/auth-middleware.ts` - API authentication middleware
- `src/contexts/AuthContext.tsx` - React auth context

### **Event System**
- `src/utils/event-emitter.ts` - Event emission
- `src/utils/realtime-event-emitter.ts` - Real-time updates

### **Logging**
- `src/utils/logger.ts` - Winston logger
- Structured logging to CloudWatch

### **API Helpers**
- `src/utils/api-response.ts` - Standardized API responses
- `src/lib/api-client.ts` - API client utilities
- `src/lib/api.ts` - API helper functions

### **RSS Generation**
- `src/utils/rss-generator.ts` - RSS feed generation

### **Data Persistence**
- `src/lib/runs-persistence.ts` - Run data persistence
- `src/lib/runs-store.ts` - In-memory run store

---

## 📚 **Dependencies & Libraries**

### **AWS SDK**
- `@aws-sdk/client-dynamodb` - DynamoDB access
- `@aws-sdk/client-s3` - S3 access
- `@aws-sdk/client-cognito-identity-provider` - Cognito
- `@aws-sdk/client-secrets-manager` - Secrets
- `@aws-sdk/client-sfn` - Step Functions
- `@aws-sdk/client-cloudwatch-logs` - Logging
- `@aws-sdk/s3-request-presigner` - Presigned URLs

### **AI/ML**
- `openai` - OpenAI API client (GPT-4, TTS)
- `playwright` - Browser automation for scraping

### **Web Framework**
- `next` - Next.js framework
- `react` - React library
- `react-dom` - React DOM

### **UI Libraries**
- `@radix-ui/react-*` - UI components
- `lucide-react` - Icons
- `tailwindcss` - CSS framework
- `clsx` - Class name utilities

### **Data Processing**
- `zod` - Schema validation
- `date-fns` - Date utilities
- `uuid` - UUID generation
- `fast-xml-parser` - XML parsing (RSS)
- `robots-parser` - robots.txt parsing

### **Other**
- `winston` - Logging
- `axios` - HTTP client
- `dotenv` - Environment variables
- `sharp` - Image processing

---

## 🌐 **System Dependencies**

### **Playwright Runtime**
- **Chromium browser** (installed in container)
- **Playwright system dependencies:**
  - libnss3, libnspr4 (NSS libraries)
  - libatk, libatk-bridge (Accessibility)
  - libcups2 (Printing)
  - libdrm2, libgbm1 (Graphics)
  - libxkbcommon, libxcomposite, libxdamage, libxfixes, libxrandr (X11)
  - libasound2 (Audio)
  - fonts-liberation (Fonts)
  - xdg-utils (Desktop integration)

**Total size:** ~1.5-2GB (with Playwright)

---

## 📁 **File Structure in Container**

```
/app/
├── node_modules/          # All npm dependencies (~500MB)
├── .next/                 # Next.js build output (~200MB)
│   ├── standalone/        # Standalone server files
│   └── static/            # Static assets
├── src/                   # Source code
│   ├── app/               # Next.js pages & API routes
│   ├── components/        # React components
│   ├── engine/            # Pipeline engine
│   ├── gateways/          # Provider gateways
│   ├── lib/               # Utilities
│   ├── types/             # TypeScript types
│   └── utils/             # Helper functions
├── public/                # Static files (if any)
├── containers/            # Container-specific code
├── scripts/               # Utility scripts
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

---

## 🚀 **What Runs When Container Starts**

### **Startup Process:**
1. **Container starts** → Node.js 18 runtime
2. **Runs:** `npm start` → `next start`
3. **Next.js server starts** on port 3000
4. **Ready to serve:**
   - Frontend pages (React)
   - API routes (Next.js API)
   - Pipeline orchestrator (via API routes)

### **Runtime Capabilities:**
- ✅ Serve frontend UI
- ✅ Handle API requests
- ✅ Execute pipeline stages
- ✅ Scrape websites (Playwright)
- ✅ Call OpenAI API (GPT-4, TTS)
- ✅ Read/write DynamoDB
- ✅ Read/write S3
- ✅ Generate RSS feeds
- ✅ Real-time event streaming

---

## 💾 **Container Size Breakdown**

| Component | Size | Notes |
|-----------|------|-------|
| **Base Image** (node:18-slim) | ~200MB | Node.js runtime |
| **System Dependencies** | ~300MB | Playwright deps |
| **Node Modules** | ~500MB | npm packages |
| **Next.js Build** | ~200MB | Compiled code |
| **Playwright Browser** | ~300MB | Chromium |
| **Source Code** | ~50MB | Your code |
| **Total** | **~1.5-2GB** | Final image size |

---

## 🔄 **What Happens During Execution**

### **Example: User Creates Podcast**

1. **User visits** `/podcasts/new` → Frontend renders
2. **User submits form** → `POST /api/podcasts`
3. **API route** → Creates podcast in DynamoDB
4. **Response** → Frontend updates

### **Example: User Runs Pipeline**

1. **User clicks "Run Now"** → `POST /api/podcasts/[id]/runs`
2. **API route** → Calls `executePipeline()`
3. **PipelineOrchestrator** → Runs all 13 stages:
   - Stage 1: Prepare (calculates budgets)
   - Stage 2: Discover (finds articles via HTTP gateway)
   - Stage 3: Scrape (uses Playwright to scrape)
   - Stage 4: Extract (calls OpenAI GPT-4)
   - ... (all stages)
   - Stage 13: Package (saves to S3)
4. **Results** → Saved to S3 + DynamoDB
5. **Response** → Frontend shows progress

---

## 🎯 **Key Points**

### **Everything is Self-Contained:**
- ✅ No external services needed (except AWS services)
- ✅ All code in one place
- ✅ All dependencies included
- ✅ All stages run in same process

### **What's NOT in Container:**
- ❌ **DynamoDB** - External AWS service
- ❌ **S3** - External AWS service
- ❌ **Cognito** - External AWS service
- ❌ **CloudFront** - External AWS service
- ❌ **Step Functions** - External AWS service

**These are accessed via AWS SDK from within the container.**

---

## 📊 **Resource Requirements**

### **Recommended Container Size:**
- **CPU:** 2 vCPU
- **Memory:** 4GB RAM
- **Storage:** ~2GB (image) + ephemeral storage

### **Why These Resources:**
- **Playwright** needs memory for browser
- **Pipeline stages** can be memory-intensive
- **OpenAI API calls** need CPU for processing
- **Next.js** needs memory for React rendering

---

## ✅ **Summary**

**The single container contains:**
1. ✅ **Next.js server** (frontend + API)
2. ✅ **All React pages** (UI)
3. ✅ **All API routes** (backend)
4. ✅ **Pipeline orchestrator** (orchestration)
5. ✅ **All 13 pipeline stages** (processing)
6. ✅ **All gateways** (LLM, TTS, HTTP)
7. ✅ **All utilities** (auth, logging, etc.)
8. ✅ **Playwright** (web scraping)
9. ✅ **All dependencies** (npm packages)
10. ✅ **Everything needed** to run the app

**One container. Everything. Ready to go.** 🎉

---

**Last Updated**: 2025-01-17

