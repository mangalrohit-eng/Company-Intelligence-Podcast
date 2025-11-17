# Extract Stage API Call - Detailed Explanation

## 🎯 What Extract Does

The **Extract stage** takes scraped news articles and uses **OpenAI GPT-4** to pull out **structured evidence** that can be used in the podcast.

Think of it as having an AI read each article and highlight the important facts, numbers, and quotes.

---

## 🔄 The Process

### Step 1: Loop Through Each Article
```typescript
for (let i = 0; i < contents.length; i++) {
  const content = contents[i]; // Each scraped article
  
  // Make ONE API call per article ⚠️ EXPENSIVE
  const response = await this.llmGateway.complete({...});
}
```

**Problem:** If you scraped 10 articles, this makes **10 separate API calls**!

---

## 📤 What Gets Sent to OpenAI

### The System Prompt (Instructions):
```
You are an evidence extraction system. Extract key facts, stats, and quotes from news articles.

Extract and return a JSON object with an "items" array containing:
- STATS: Numbers with context (revenue, growth, market share)
- QUOTES: Short quotes (max 10 words) from named sources
- CLAIMS: Verifiable factual claims

Format: {"items": [{"type": "stat"|"quote"|"claim", "span": "the fact/quote/claim", "context": "surrounding context"}]}

If no evidence found, return: {"items": []}
```

### The User Message (The Article):
```
Extract evidence from this Citibank news article:

Title: Citibank Completes Exit from Russia

Content: [First 5,000 characters of article content]

Return JSON with extracted evidence.
```

### API Call Parameters:
```typescript
{
  model: 'gpt-4-turbo-preview',  // ⚠️ EXPENSIVE model
  temperature: 0.3,               // Low = more consistent
  maxTokens: 1000,                // Max response length
  responseFormat: 'json_object',  // Force JSON output
}
```

---

## 📥 What Comes Back from OpenAI

### Example Response:
```json
{
  "items": [
    {
      "type": "stat",
      "span": "Citiâ€™s Russian loan portfolio shrank by 98 percent",
      "context": "The bank significantly reduced its exposure in Russia following sanctions"
    },
    {
      "type": "claim",
      "span": "Citibank has finalized its exit from Russia",
      "context": "Authorized by decree signed by Russian leader Vladimir Putin"
    },
    {
      "type": "quote",
      "span": "This marks the end of our operations",
      "context": "CEO statement about the Russia exit"
    },
    {
      "type": "stat",
      "span": "deposits from individuals and corporations fell by up to 150 times",
      "context": "During the wind-down process over the past year"
    }
  ]
}
```

---

## 🔧 Post-Processing

After receiving the response, the code:

### 1. **Parses the JSON**
```typescript
const extracted = JSON.parse(response.content);
const items = extracted.items || [];
```

### 2. **Enforces 10-Word Quote Limit**
```typescript
if (item.type === 'quote') {
  const wordCount = item.span.split(/\s+/).length;
  if (wordCount > 10) {
    // Truncate: "This is a very long quote..." → "This is a very long quote..."
    item.span = item.span.split(/\s+/).slice(0, 10).join(' ') + '...';
  }
}
```

### 3. **Deduplicates Evidence**
```typescript
const dedupeKey = `${item.span}::${content.url}`;
if (seenEvidence.has(dedupeKey)) {
  dedupeRemoved++;
  continue; // Skip duplicate
}
seenEvidence.add(dedupeKey);
```

### 4. **Enriches with Metadata**
```typescript
units.push({
  id: uuidv4(),                          // Unique ID
  topicId: content.topicIds[0],          // Which topic (company-news, etc.)
  entityId: content.entityIds[0],        // Which company
  type: item.type,                       // stat, quote, or claim
  span: item.span,                       // The actual text
  context: item.context || '',           // Surrounding context
  sourceUrl: content.url,                // Original article URL
  publisher: content.publisher,          // e.g., "Reuters"
  publishedDate: content.publishedDate,  // Publication date
  authority: calculateAuthority(publisher), // 0.5-0.9 based on source
});
```

### 5. **Authority Scoring**
```typescript
calculateAuthority(publisher: string): number {
  const knownHighAuthority = ['Reuters', 'Bloomberg', 'WSJ', 'FT'];
  const knownMediumAuthority = ['TechCrunch', 'The Verge'];
  
  if (knownHighAuthority.some(p => publisher.includes(p))) {
    return 0.9; // High trust
  } else if (knownMediumAuthority.some(p => publisher.includes(p))) {
    return 0.7; // Medium trust
  } else {
    return 0.5; // Unknown source
  }
}
```

---

## 📊 Real Example from Your Run

From `run_1763416947664_9kios9`:

**Input:** 10 scraped articles about Citibank

**Output:** 62 evidence units
- 38 claims
- 18 stats
- 6 quotes

**All tagged to:** `company-news` topic

**Sample Evidence:**
```json
{
  "type": "claim",
  "span": "Citibank has finalized its exit from Russia",
  "sourceUrl": "https://news.google.com/rss/articles/..."
},
{
  "type": "stat",
  "span": "Citiâ€™s Russian loan portfolio shrank by 98 percent",
  "sourceUrl": "https://news.google.com/rss/articles/..."
}
```

---

## 💰 Cost Analysis

### Per Article:
- **Input:** ~5,000 characters = ~1,250 tokens (article content)
- **System prompt:** ~100 tokens
- **Output:** ~300-500 tokens (extracted evidence)
- **Total per article:** ~1,650-1,850 tokens

### Cost (GPT-4 Turbo):
- Input: 1,350 tokens × $0.01/1K = **$0.0135**
- Output: 500 tokens × $0.03/1K = **$0.015**
- **Total per article: ~$0.03**

### For 10 Articles:
- **10 API calls**
- **~18,000 tokens total**
- **Cost: ~$0.30** just for the Extract stage

**This is the single most expensive stage in the pipeline!**

---

## ⚠️ Problems with Current Implementation

### 1. **Too Many API Calls**
```typescript
// ❌ BAD: 10 articles = 10 API calls
for (const article of articles) {
  await llmGateway.complete({ article });
}
```

### 2. **Using Expensive GPT-4**
```typescript
// ⚠️ GPT-4 Turbo is 10x more expensive than GPT-3.5
model: 'gpt-4-turbo-preview'
```

### 3. **No Caching**
- Same article processed multiple times = wasted $$
- No cache means re-extraction every run

### 4. **No Error Recovery**
- If one API call fails, the stage fails
- No retry logic for transient errors

---

## ✅ Optimization Strategies

### 1. **Batch Articles (50% cost reduction)**
```typescript
// ✅ GOOD: 10 articles = 2 API calls (5 per batch)
const batchSize = 5;
for (let i = 0; i < articles.length; i += batchSize) {
  const batch = articles.slice(i, i + batchSize);
  await llmGateway.complete({ 
    articles: batch // Send 5 articles at once
  });
}
```

**System Prompt Update:**
```
Extract evidence from multiple articles. Return JSON:
{
  "articles": [
    {
      "url": "...",
      "items": [{"type": "stat", "span": "...", "context": "..."}]
    }
  ]
}
```

**Savings:** 10 calls → 2 calls = **50% cheaper**

---

### 2. **Use GPT-3.5 Instead (90% cost reduction)**
```typescript
// ✅ GPT-3.5 is great at structured extraction
model: 'gpt-3.5-turbo' // $0.0005/1K input, $0.0015/1K output
```

**Why it works:**
- Extracting facts is straightforward (not creative writing)
- GPT-3.5 handles JSON structured output very well
- Quality difference is minimal for this task

**Savings:** $0.03/article → $0.003/article = **90% cheaper!**

---

### 3. **Cache Results (50%+ savings over time)**
```typescript
// Check cache before API call
const cacheKey = `extract_${articleUrl}_${contentHash}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached); // ✅ FREE!
}

const result = await llmGateway.complete({ article });
await redis.set(cacheKey, JSON.stringify(result), { 
  ttl: 86400 // 24 hours
});
```

**Savings:** If 50% cache hit rate = **50% cost reduction**

---

### 4. **Add Retry Logic**
```typescript
let attempts = 0;
while (attempts < 3) {
  try {
    return await llmGateway.complete({ article });
  } catch (error) {
    if (error.status === 429) { // Rate limit
      await sleep(Math.pow(2, attempts) * 1000); // Exponential backoff
      attempts++;
    } else {
      throw error; // Don't retry other errors
    }
  }
}
```

---

## 📈 Projected Savings

| **Optimization** | **Current Cost** | **New Cost** | **Savings** |
|-----------------|------------------|--------------|-------------|
| **Baseline (10 articles)** | $0.30 | - | - |
| **+ Batch (5 per call)** | $0.30 | $0.15 | 50% |
| **+ Use GPT-3.5** | $0.30 | $0.03 | 90% |
| **+ Cache (50% hits)** | $0.30 | $0.15 | 50% |
| **All Combined** | $0.30 | **$0.015** | **95%!** |

For a **daily podcast** (30/month):
- Current: $9/month just on Extract
- Optimized: $0.45/month
- **Savings: $8.55/month**

---

## 🎯 What I Recommend

### Quick Win (This Week):
```typescript
// Change one line in src/gateways/llm/openai.ts
model: request.model || 'gpt-3.5-turbo', // Was 'gpt-4-turbo-preview'
```

**Impact:** 90% cost reduction on Extract stage immediately

### Medium Term (Next 2 Weeks):
1. Batch 3-5 articles per API call
2. Add Redis caching
3. Add retry logic with exponential backoff

**Impact:** 95% cost reduction + better reliability

---

## 🔍 Summary

**What Extract Does:**
1. Takes each scraped article (up to 5,000 chars)
2. Sends it to GPT-4 with instructions to extract facts/stats/quotes
3. Gets back structured JSON with evidence
4. Post-processes: truncates quotes, deduplicates, enriches metadata
5. Stores evidence units for later stages to use

**Why It's Expensive:**
- Uses GPT-4 Turbo (10x more expensive than GPT-3.5)
- Makes 1 API call per article (10 articles = 10 calls)
- No caching or batching
- ~$0.30 per run for Extract alone

**How to Fix:**
- Switch to GPT-3.5 (90% cheaper, same quality for this task)
- Batch multiple articles per call (50% fewer calls)
- Add Redis caching (50% cache hits = 50% savings)
- **Total savings: 95%**

Would you like me to implement these optimizations? I can start with the quick win (switch to GPT-3.5) right now!

