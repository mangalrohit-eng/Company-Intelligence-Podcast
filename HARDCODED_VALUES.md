# Hardcoded Values & Assumptions in Codebase

This document lists all hardcoded values, constants, and assumptions in the podcast generation pipeline, organized by module.

---

## 1️⃣ ADMIN SETTINGS DEFAULTS
**File:** `src/types/admin-settings.ts`

### Pipeline Settings
- **wordsPerMinute:** `150` - Average speaking rate for podcast narration
- **wordsPerArticle:** `500` - Expected average length of news articles
- **scrapeSuccessRate:** `0.5` (50%) - Expected percentage of successful scrapes
- **relevantTextRate:** `0.25` (25%) - Expected percentage of relevant text in articles

### AI Model Assignments
- **competitorIdentification:** `gpt-3.5-turbo`
- **extract:** `gpt-3.5-turbo` (Simple extraction, cost-effective)
- **summarize:** `gpt-3.5-turbo` (Straightforward summarization)
- **contrast:** `gpt-3.5-turbo` (Simple comparisons)
- **outline:** `gpt-4-turbo-preview` (Thematic thinking needs GPT-4)
- **script:** `gpt-4-turbo-preview` (Creative writing needs GPT-4)
- **qa:** `gpt-3.5-turbo` (Yes/no verification)

### RSS Feeds (DEFAULT_DISCOVERY_SETTINGS)
**Enabled:**
- **Google News:** `https://news.google.com/rss/search?q={company}`

**Disabled (examples only):**
- **Reuters:** `https://www.reuters.com/rssfeed/companyNews` (discontinued in 2020)
- **Financial Times:** `https://www.ft.com/?format=rss` (no keyword filtering)

---

## 2️⃣ SCRAPE STAGE
**File:** `src/engine/stages/scrape.ts`

### Timeouts & Limits
- **PER_DOMAIN_CONCURRENCY:** `1` - Polite scraping (one request at a time per domain)
- **DOMAIN_DELAY_MS:** `1000` (1 second) - Delay between requests to same domain
- **DEFAULT_TIME_CAP_MINUTES:** `30` - Stop scraping after 30 minutes
- **DEFAULT_FETCH_CAP:** `200` - Stop after 200 successful scrapes

### Stop Conditions
- **MIN_BREADTH:** `3` - Need at least 3 unique sources per topic
- **MIN_CONFIDENCE:** `0.6` (60%) - Minimum confidence threshold

### Fallback
- **Demo articles:** 5 pre-curated Citibank articles in `src/engine/demo-articles.ts`
- Used when all scraping fails to ensure pipeline has content

---

## 3️⃣ RANK STAGE
**File:** `src/engine/stages/rank.ts`

### Ranking Factor Weights
Formula: `Expected Info Gain / Cost`

**Info Gain weights:**
- **Recency (R):** `15%` - How recent the article is
- **Freshness (F):** `15%` - From discovery scores
- **Authority (A):** `25%` - Publisher domain reputation (highest weight)
- **Diversity (D):** `20%` - Penalize over-represented domains
- **Specificity (S):** `25%` - Topic/entity relevance (highest weight)

### Calculation Constants
- **Recency decay:** 7 days (168 hours)
  - Formula: `max(0, 1 - ageHours / (24 * 7))`
  
- **Diversity floor:** `0.3` (minimum score)
  - Formula: `max(0.3, 1 - (domainCount / total) * 2)`
  
- **Cost estimate:** 2-5 seconds per URL
  - Formula: `2.0 + random(0-3)`

---

## 4️⃣ DISAMBIGUATE STAGE
**File:** `src/engine/stages/disambiguate.ts`

### Thresholds
- **CONFIDENCE_THRESHOLD:** `0.85` (85%)
  - Only articles with ≥85% entity confidence pass through

---

## 5️⃣ DISCOVER STAGE
**File:** `src/engine/stages/discover.ts`

### Default Scores
- **Relevance (keyword match):** `0.9` (90%)
- **Authority (default):** `0.7` (70%)
- **Default topic:** `'company-news'` (if no topics provided)

---

## 6️⃣ TTS STAGE
**File:** `src/engine/stages/tts.ts`

### Character Limits
- **MAX_CHUNK_SIZE:** `4000` characters
  - OpenAI TTS API limit is 4096; uses 4000 for safety margin
  - Scripts are chunked by sentences to stay within limit

---

## 7️⃣ PLAYWRIGHT HTTP GATEWAY
**File:** `src/gateways/http/playwright.ts`

### Timeouts & Delays
- **Page timeout:** `30000` ms (30 seconds)
- **Wait strategy:** `'networkidle'` - Waits for all network requests to finish
- **Google News delay:** `2000` ms (2 seconds) - Extra time for JS redirects

---

## 8️⃣ ORCHESTRATOR
**File:** `src/engine/orchestrator.ts`

### Fallback RSS Feed
- If no feeds configured in admin settings:
  - **Google News:** `https://news.google.com/rss/search?q={company}`

### Per-Topic Evidence Target
- **Formula:** `duration * 2 / topicCount`
- **Example:** 5-min podcast with 3 topics = 3.3 evidence units per topic

---

## 9️⃣ RUNS PERSISTENCE
**File:** `src/lib/runs-persistence.ts`

### Cleanup Policy
- **Completed runs:** Keep ALL (no limit)
- **Failed/Running runs:** Keep last 50 per podcast
- **Auto-cleanup:** Runs when saving to prevent database bloat

---

## 🔟 DEMO ARTICLES
**File:** `src/engine/demo-articles.ts`

### Hardcoded Fallback Content
- **Count:** 5 pre-curated Citibank news articles
- **Purpose:** Used when all scraping fails
- **Ensures:** Pipeline always has content to process

---

## 💡 SUMMARY

### Most Critical (Frequently Impact Results)
✅ **Article limit formula** - Now configurable via Admin Settings (`/admin/settings`)  
✅ **Ranking weights** - 15%, 15%, 25%, 20%, 25% for R, F, A, D, S  
✅ **Scrape limits** - 30 min timeout, 200 articles fetch cap  
✅ **AI model assignments** - GPT-3.5 vs GPT-4 for different stages  
✅ **RSS feeds** - Google News only by default  

### Less Critical (Infrastructure/Technical)
⚙️ **Playwright timeout** - 30s per page  
⚙️ **Domain delay** - 1s between requests (polite scraping)  
⚙️ **TTS chunk size** - 4000 chars  
⚙️ **Confidence threshold** - 85% for disambiguation  

---

## 🔧 Making Changes

### Configurable via Admin UI
Navigate to `/admin/settings` to change:
- Words per minute
- Words per article
- Scrape success rate
- Relevant text rate
- RSS feeds (coming soon)
- AI models (coming soon)

### Requires Code Changes
Other values require editing source files and redeploying:
- Ranking weights
- Scrape timeouts/limits
- Confidence thresholds
- Playwright settings

