# Summarize Module Explanation

## 🎯 What the Summarize Module Does

The **Summarize Stage** (Stage 7) takes evidence units extracted from articles and creates topic summaries for the podcast script.

### Process Flow:

1. **Input**: Evidence units grouped by topic (from Extract stage)
   - Stats: Numbers/facts (e.g., "$508 price target")
   - Quotes: Short quotes ≤10 words (e.g., "I was very humbled...")
   - Claims: Verifiable factual claims

2. **For Each Topic**:
   - **Requires BOTH**: At least 1 stat AND at least 1 quote
   - Filters evidence to ensure it has required fields:
     - `span` (the actual text)
     - `authority` (0-1 score, publisher reputation)
   - If stat or quote missing → uses claims as fallback
   - If still missing → **SKIPS the topic** (no summary generated)

3. **LLM Generation**:
   - Sends stat + quote to OpenAI
   - Generates 1 engaging paragraph
   - Marks inferences with `[CHECK]` markers

4. **Output**: `TopicSummary[]` with:
   - `paragraph`: The generated text
   - `onAirStat`: The stat used
   - `onAirQuote`: The quote used
   - `inferenceFlags`: List of [CHECK] markers

---

## ❌ Why It Returns 0 Results

The summarize stage returns 0 summaries when **ALL topics are skipped**. A topic is skipped if:

### Filtering Logic (Lines 55-84 in `summarize.ts`):

```typescript
// Filter stats/quotes to ensure they have required fields
let stat = stats
  .filter(s => s.span && s.authority !== undefined)  // ← KEY FILTER
  .sort((a, b) => b.authority - a.authority)[0];

let quote = quotes
  .filter(q => q.span && q.authority !== undefined)  // ← KEY FILTER
  .sort((a, b) => b.authority - a.authority)[0];

// If no stat OR no quote found (even after fallback) → SKIP TOPIC
if (!stat || !quote) {
  logger.warn('Missing stat or quote for topic');
  continue;  // ← SKIPS THIS TOPIC
}
```

### Common Causes:

1. **Missing `authority` Field**
   - Evidence units must have `authority: number` (0-1)
   - If `authority === undefined` → filtered out
   - **Check**: Extract stage should set `authority: this.calculateAuthority(content.publisher)`

2. **Missing `span` Field**
   - Evidence units must have `span: string` (the actual text)
   - If `span` is empty/null → filtered out

3. **No Stats or Quotes**
   - Extract returned only claims (no stats/quotes)
   - Fallback to claims works, but if claims also missing fields → skip

4. **LLM API Error**
   - If OpenAI API fails during summary generation
   - Stage throws error → returns null → 0 summaries

---

## 🔍 Debugging Steps

### 1. Check Extract Output:
```bash
# Look at extract_output.json
cat output/episodes/{runId}/debug/extract_output.json

# Check:
# - stats.byType.stat (should be > 0)
# - stats.byType.quote (should be > 0)
```

### 2. Check Summarize Input:
```bash
# Look at summarize_input.json
cat output/episodes/{runId}/debug/summarize_input.json

# Check:
# - topicIds (should not be empty)
# - evidenceByTopic[].unitCount (should be > 0)
# - sampleUnits should have 'span' and 'authority' fields
```

### 3. Check Server Logs:
Look for these log messages:
- `"Evidence breakdown for topic"` - shows stats/quotes/claims count
- `"Missing stat or quote for topic"` - topic was skipped
- `"Using claim as fallback"` - fallback logic activated
- `"Topic summary created"` - success!

### 4. Check for Error File:
```bash
# If stage failed, check:
cat output/episodes/{runId}/debug/summarize_error.json
```

---

## 💡 Example: Why Your Run Returned 0 Results

For run `run_1763438165358_t77rt`:
- ✅ Extract returned: 31 units (5 stats, 8 quotes, 18 claims)
- ✅ Topic: "company-news" with 31 evidence units
- ❌ **Problem**: Evidence units in debug output missing `authority`, `publisher`, `context` fields

**Root Cause**: The debug output only shows a subset of fields (`type`, `topicId`, `span`, `sourceUrl`), but the actual evidence units passed to summarize should have all fields. If they don't, the filtering removes them.

**Solution**: Verify that the Extract stage is actually setting `authority` on all evidence units. Check the actual evidence units (not just debug output) to confirm they have:
- `span: string`
- `authority: number` (0-1)
- `publisher: string`
- `context: string`

---

## 🛠️ How to Fix

1. **Ensure Extract Stage Sets Authority**:
   ```typescript
   // In extract.ts line 125
   authority: this.calculateAuthority(content.publisher),
   ```

2. **Add Better Logging**:
   ```typescript
   // In summarize.ts, log filtered counts
   logger.debug('After filtering', {
     validStats: stats.filter(s => s.span && s.authority !== undefined).length,
     validQuotes: quotes.filter(q => q.span && q.authority !== undefined).length,
   });
   ```

3. **Make Filtering More Lenient** (if needed):
   ```typescript
   // Allow undefined authority (default to 0.5)
   .filter(s => s.span && (s.authority !== undefined || s.authority !== null))
   ```

---

## 📊 Expected Behavior

**Input**: 31 evidence units (5 stats, 8 quotes, 18 claims) for topic "company-news"

**Expected Output**: 1 summary (if at least 1 stat + 1 quote have required fields)

**Actual Output**: 0 summaries (if all stats/quotes filtered out due to missing fields)

