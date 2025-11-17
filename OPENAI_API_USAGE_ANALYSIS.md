# OpenAI API Usage Analysis

## 🔴 HIGH USAGE WARNING

Your pipeline is making **extensive use** of OpenAI's API, which can become expensive quickly.

---

## 📊 Complete API Call Breakdown

### Per Pipeline Run (13 Stages)

For a **5-minute podcast** with **3 topics** and **10 scraped articles**, here's what happens:

| **Stage** | **API Calls** | **Model** | **Purpose** | **Token Estimate** |
|-----------|---------------|-----------|-------------|-------------------|
| **1. Prepare** | 0 | - | Pure computation | 0 |
| **2. Discover** | 0 | - | RSS feed parsing | 0 |
| **3. Scrape** | 0 | - | HTTP requests | 0 |
| **4. Disambiguate** | 0 | - | Text processing | 0 |
| **5. Rank** | 0 | - | Sorting/filtering | 0 |
| **6. Extract** | **10** | GPT-4 Turbo | Extract facts from each article | ~10,000-20,000 |
| **7. Summarize** | **3** | GPT-4 Turbo | 1 summary per topic | ~1,500-3,000 |
| **8. Contrast** | **3** | GPT-4 Turbo | 1 contrast per topic | ~1,500-3,000 |
| **9. Outline** | **2** | GPT-4 Turbo | Theme + structure | ~1,000-2,000 |
| **10. Script** | **1** | GPT-4 Turbo | Generate full script | ~1,500-3,000 |
| **11. QA** | **0-20+** | GPT-4 Turbo | Verify each [CHECK] marker | ~5,000-20,000 |
| **12. TTS** | **1-3** | TTS-1 | Text-to-speech chunks | ~2,000-4,000 |
| **13. Package** | 0 | - | File operations | 0 |
| **TOTAL** | **20-42** | - | - | **~22,500-55,000** |

---

## 🚨 The Biggest Cost Drivers

### 1. **Extract Stage** (40-50% of costs)

**Current Implementation:**
```typescript
// src/engine/stages/extract.ts (line 41-77)
for (let i = 0; i < contents.length; i++) {
  const content = contents[i];
  
  // ❌ ONE API CALL PER ARTICLE
  const response = await this.llmGateway.complete({
    messages: [...],
    temperature: 0.3,
    maxTokens: 1000,
    responseFormat: 'json_object',
  });
}
```

**Problem:**
- 10 articles = 10 separate API calls
- Each call sends 5000 characters of article text
- Uses expensive GPT-4 Turbo model

**Cost per run:**
- 10 articles × ~2,000 tokens each = ~20,000 tokens
- At GPT-4 Turbo pricing (~$0.01/1K input tokens, ~$0.03/1K output tokens)
- **~$0.30-$0.50 per Extract stage**

---

### 2. **QA Stage** (20-40% of costs)

**Current Implementation:**
```typescript
// src/engine/stages/qa.ts (line 67-75)
for (let i = 0; i < checkMatches.length; i++) {
  // ❌ ONE API CALL PER [CHECK] MARKER
  const verification = await this.verifyCheck(claim, evidenceUnits);
}
```

**Problem:**
- The Summarize, Contrast, and Script stages add [CHECK] markers for any inference
- A typical script might have 10-20 [CHECK] markers
- Each verification requires an API call with full evidence context

**Cost per run:**
- 15 [CHECK] markers × ~1,000 tokens each = ~15,000 tokens
- **~$0.20-$0.30 per QA stage**

---

### 3. **TTS Stage** (10-20% of costs)

**Current Implementation:**
```typescript
// src/engine/stages/tts.ts (line 68-82)
for (let i = 0; i < chunks.length; i++) {
  // ONE TTS API CALL PER CHUNK (4000 chars max)
  const response = await this.ttsGateway.synthesize({
    text: chunks[i],
    voice,
    speed,
    model: 'tts-1',
    responseFormat: 'mp3',
  });
}
```

**Cost per run:**
- 5-minute podcast = ~750 words = ~4,500 characters
- Typically 1-2 chunks
- At TTS-1 pricing (~$0.015/1K characters)
- **~$0.07-$0.10 per TTS stage**

---

### 4. **Other LLM Stages** (20-30% of costs)

**Summarize, Contrast, Outline, Script:**
- Summarize: 3 calls (1 per topic) × ~500 tokens = ~1,500 tokens
- Contrast: 3 calls (1 per topic) × ~500 tokens = ~1,500 tokens
- Outline: 2 calls (theme + structure) × ~500 tokens = ~1,000 tokens
- Script: 1 call × ~2,000 tokens = ~2,000 tokens

**Total: ~6,000 tokens = ~$0.10-$0.15**

---

## 💰 Total Cost Estimate Per Run

### Conservative Estimate (Small podcast, few articles):
- Extract: $0.30
- QA: $0.20
- TTS: $0.07
- Other LLM: $0.10
- **Total: ~$0.67 per run**

### Realistic Estimate (Typical use):
- Extract: $0.50
- QA: $0.30
- TTS: $0.10
- Other LLM: $0.15
- **Total: ~$1.05 per run**

### High-End Estimate (Many articles, long script):
- Extract: $0.80
- QA: $0.50
- TTS: $0.15
- Other LLM: $0.20
- **Total: ~$1.65 per run**

---

## 📈 Usage Scenarios

### Daily Podcast (1 episode/day):
- **Monthly cost: ~$31.50** (30 runs × $1.05)
- **Annual cost: ~$383**

### Multiple Podcasts (3 episodes/day):
- **Monthly cost: ~$94.50** (90 runs × $1.05)
- **Annual cost: ~$1,149**

### Testing/Development (10 runs/day):
- **Monthly cost: ~$315** (300 runs × $1.05)
- **Annual cost: ~$3,830**

---

## 🎯 Cost Optimization Strategies

### 1. **Batch Extract API Calls** (Save 30-40%)

**Current:** 10 articles = 10 API calls  
**Optimized:** 10 articles = 1-2 API calls

**Implementation:**
```typescript
// Instead of processing articles one-by-one
for (const article of articles) {
  await llmGateway.complete({ article }); // ❌ Expensive
}

// Batch multiple articles in one call
const batchSize = 5;
for (let i = 0; i < articles.length; i += batchSize) {
  const batch = articles.slice(i, i + batchSize);
  await llmGateway.complete({ 
    articles: batch // ✅ 50% fewer API calls
  });
}
```

**Savings:** ~$0.15-$0.25 per run

---

### 2. **Cache Extraction Results** (Save 40-50%)

If you're re-processing the same articles, cache the extracted evidence:

```typescript
// Check cache before making API call
const cacheKey = `extract_${articleUrl}_${articleHash}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return cached; // ✅ Zero cost
}

const result = await llmGateway.complete({ article });
await redis.set(cacheKey, result, { ttl: 86400 }); // Cache for 24h
```

**Savings:** ~$0.20-$0.40 per run (if 50% cache hits)

---

### 3. **Reduce [CHECK] Marker Verification** (Save 20-30%)

**Option A:** Only verify high-confidence [CHECK] markers
```typescript
// Skip verification for obvious inferences
if (claim.length < 20 || claim.includes('likely') || claim.includes('may')) {
  // ✅ Skip API call, just remove the marker
  continue;
}
```

**Option B:** Batch [CHECK] verifications
```typescript
// Instead of 15 separate calls, make 3 calls with 5 checks each
const batchSize = 5;
for (let i = 0; i < checks.length; i += batchSize) {
  const batch = checks.slice(i, i + batchSize);
  await llmGateway.complete({ checks: batch }); // ✅ Fewer calls
}
```

**Savings:** ~$0.10-$0.15 per run

---

### 4. **Use GPT-3.5 for Some Stages** (Save 50-70%)

GPT-3.5 Turbo is **10x cheaper** than GPT-4 Turbo:
- GPT-4 Turbo: ~$0.01/1K input, ~$0.03/1K output
- GPT-3.5 Turbo: ~$0.0005/1K input, ~$0.0015/1K output

**Safe to use GPT-3.5 for:**
- Extract (fact extraction is straightforward)
- Contrast (simple comparisons)
- QA verification (yes/no decisions)

**Keep GPT-4 for:**
- Script (needs creativity and coherence)
- Outline (requires thematic thinking)

**Implementation:**
```typescript
// Add model parameter to gateway config
const extractResponse = await llmGateway.complete({
  model: 'gpt-3.5-turbo', // ✅ 10x cheaper
  messages: [...],
});
```

**Savings:** ~$0.40-$0.60 per run

---

### 5. **Implement Rate Limiting & Quotas** (Prevent Runaway Costs)

```typescript
// Track daily usage
const todayUsage = await redis.get('openai_usage_today');
if (todayUsage > DAILY_QUOTA) {
  throw new Error('Daily OpenAI quota exceeded');
}

// Track per-user usage
const userUsage = await redis.get(`user_usage_${userId}`);
if (userUsage > USER_DAILY_LIMIT) {
  throw new Error('User daily limit reached');
}
```

---

## 🔧 Recommended Implementation Order

### Phase 1: Quick Wins (This Week)
1. ✅ **Switch Extract to GPT-3.5** (saves ~$0.20/run)
2. ✅ **Reduce QA verifications** (saves ~$0.10/run)
3. ✅ **Add usage tracking/logging**

**Expected Savings: ~30% ($0.30/run)**

### Phase 2: Medium Effort (Next 2 Weeks)
1. 🔄 **Batch Extract API calls** (saves ~$0.20/run)
2. 🔄 **Batch QA verifications** (saves ~$0.10/run)
3. 🔄 **Add cost alerts**

**Expected Savings: ~50% ($0.50/run)**

### Phase 3: Long-Term (Next Month)
1. ⏳ **Implement Redis caching** (saves ~$0.30/run)
2. ⏳ **Fine-tune GPT-3.5 for Extract** (saves ~$0.10/run)
3. ⏳ **Add user quotas**

**Expected Savings: ~70% ($0.70/run)**

---

## 📉 Projected Savings

| **Scenario** | **Current Cost** | **After Phase 1** | **After Phase 2** | **After Phase 3** |
|--------------|-----------------|-------------------|-------------------|-------------------|
| **Per Run** | $1.05 | $0.75 (-29%) | $0.55 (-48%) | $0.35 (-67%) |
| **Daily (1 episode)** | $1.05 | $0.75 | $0.55 | $0.35 |
| **Monthly (30 episodes)** | $31.50 | $22.50 | $16.50 | $10.50 |
| **Annual (365 episodes)** | $383 | $274 | $201 | $128 |

---

## 🚀 Alternative: Consider Claude or Local LLMs

### Claude 3 Haiku (Anthropic)
- **10x cheaper than GPT-4**
- **Comparable quality for most tasks**
- **Pricing:** ~$0.00025/1K input, ~$0.00125/1K output

### Local LLMs (Llama 3, Mistral)
- **Zero API costs** (only compute)
- **Full privacy/control**
- **Requires GPU server** (~$50-200/month)

For **high-volume production**, local LLMs could save thousands per year.

---

## 📊 Current Usage Monitoring

To see your actual usage:

1. **Check OpenAI Dashboard:**
   - https://platform.openai.com/usage
   - Look at daily/monthly costs

2. **Add Logging to Your Code:**
```typescript
// Add to src/gateways/llm/openai.ts
logger.info('OpenAI LLM call', {
  model: request.model,
  promptTokens: completion.usage?.prompt_tokens,
  completionTokens: completion.usage?.completion_tokens,
  totalTokens: completion.usage?.total_tokens,
  estimatedCost: (completion.usage?.total_tokens || 0) * 0.00001, // rough estimate
});
```

3. **Track Per-Run Costs:**
```typescript
// Add to orchestrator
let totalTokens = 0;
let totalCost = 0;

// After each LLM call
totalTokens += response.usage.totalTokens;
totalCost += calculateCost(response.usage, model);

// At end of run
logger.info('Run completed', { 
  runId, 
  totalTokens, 
  estimatedCost: totalCost 
});
```

---

## ⚠️ Warning Signs You're Overspending

- OpenAI monthly bill > $100 for a hobby project
- More than 50 test runs per day
- Multiple developers running pipelines simultaneously
- No caching or deduplication in place
- Using GPT-4 for everything
- Not monitoring usage/costs

---

## ✅ Action Items

### Immediate (Today):
- [ ] Check your OpenAI dashboard usage/costs
- [ ] Add token usage logging to all LLM calls
- [ ] Switch Extract stage to GPT-3.5-turbo

### This Week:
- [ ] Implement daily usage tracking
- [ ] Add cost alerts (email when > $10/day)
- [ ] Reduce QA verification calls

### Next 2 Weeks:
- [ ] Batch Extract API calls
- [ ] Implement Redis caching for extractions
- [ ] Add per-user quotas

---

## 📞 Need Help?

If you're seeing unexpectedly high bills:
1. Check OpenAI dashboard for spike
2. Review server logs for unusual activity
3. Implement rate limiting ASAP
4. Consider switching to cheaper models
5. Add comprehensive cost tracking

---

## Summary

**Your pipeline is making 20-42 OpenAI API calls per run, costing ~$1.05 per podcast.**

**Top optimizations:**
1. ✅ Use GPT-3.5 for Extract (50% cheaper)
2. ✅ Batch API calls where possible (40% fewer calls)
3. ✅ Cache extracted evidence (50% cache hit rate)
4. ✅ Reduce QA verifications (30% fewer calls)

**Potential savings: 50-70% ($0.50-$0.70 per run)**

For a production system generating **1 podcast/day**, this could save **~$200/year**.

