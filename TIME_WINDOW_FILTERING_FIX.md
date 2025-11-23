# Time Window Filtering Fix

## Problem

Run `run_1763869663445_96abbk` selected an article from 2023 (2 years old) despite a 720-hour (30-day) time window. The QA stage detected this but didn't prevent it from being used.

## Root Causes Identified

### 1. **Discover Stage - No Time Window Filtering**
- **Location**: `src/engine/stages/discover.ts`
- **Issue**: Discover stage accepted all articles regardless of publication date
- **Bug**: Used `new Date().toISOString()` as fallback for missing dates (line 72), making old articles appear current

### 2. **Rank Stage - No Time Window Filtering**
- **Location**: `src/engine/stages/rank.ts`
- **Issue**: Ranked articles without checking if they're within the time window

### 3. **QA Stage - Detection Only, No Enforcement**
- **Location**: `src/engine/stages/qa.ts`
- **Issue**: `checkDateSanity()` only logged warnings but didn't:
  - Fail the pipeline
  - Filter out evidence outside the window
  - Prevent old articles from being used in the script

## Fixes Applied

### 1. Discover Stage (`src/engine/stages/discover.ts`)

**Changes:**
- Added `timeWindowStart` and `timeWindowEnd` parameters to `execute()` method
- Fixed date parsing bug: Skip articles without valid publication dates (don't use current date as fallback)
- Added time window filtering for RSS feeds:
  - Parse and validate publication dates
  - Skip articles outside the time window
  - Log filtered articles for debugging
- Added time window filtering for News API articles:
  - Same validation and filtering logic

**Code:**
```typescript
// Before: Used current date as fallback
const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();

// After: Skip articles without dates, validate, and filter
if (!pubDateRaw) {
  logger.debug('Skipping article without publication date');
  continue;
}
let pubDate: Date;
try {
  pubDate = new Date(pubDateRaw);
  if (isNaN(pubDate.getTime())) continue;
} catch (error) {
  continue;
}

if (timeWindowStart && timeWindowEnd) {
  if (pubDate < timeWindowStart || pubDate > timeWindowEnd) {
    logger.debug('Skipping article outside time window');
    continue;
  }
}
```

### 2. Rank Stage (`src/engine/stages/rank.ts`)

**Changes:**
- Added `timeWindowStart` and `timeWindowEnd` parameters to `execute()` method
- Added time window filtering before ranking:
  - Filters out items outside the time window
  - Validates date parsing
  - Logs filtered items for debugging

**Code:**
```typescript
// Filter items by time window if provided
if (timeWindowStart && timeWindowEnd) {
  itemsToRank = items.filter(item => {
    const pubDate = new Date(item.publishedDate);
    if (isNaN(pubDate.getTime())) return false;
    return pubDate >= timeWindowStart && pubDate <= timeWindowEnd;
  });
}
```

### 3. QA Stage (`src/engine/stages/qa.ts`)

**Changes:**
- Moved date sanity check before evidence binding
- **Added enforcement**: Pipeline fails if >20% of evidence is outside time window
- **Added filtering**: Evidence outside time window is filtered out before binding
- Enhanced logging with detailed violation information

**Code:**
```typescript
// FAIL if too many violations
if (violationRatio > 0.2) {
  throw new Error(`QA failed: ${dateChecks.outsideWindow} out of ${evidenceUnits.length} evidence items are outside the time window`);
}

// Filter out evidence outside time window
const filteredEvidenceUnits = evidenceUnits.filter(evidence => {
  const publishDate = new Date(evidence.publishedDate);
  return publishDate >= timeWindowStart && publishDate <= timeWindowEnd;
});

// Use filtered evidence for binding
const evidenceBindings = await this.bindEvidence(updatedScript, filteredEvidenceUnits);
```

### 4. Orchestrator (`src/engine/orchestrator.ts`)

**Changes:**
- Pass time window to Discover stage
- Pass time window to Rank stage
- Log time window configuration for debugging

## Defense in Depth

The fix implements **three layers of protection**:

1. **Discover Stage**: Filters at source - old articles never enter the pipeline
2. **Rank Stage**: Secondary filter - catches any that slip through
3. **QA Stage**: Final enforcement - fails pipeline if too many violations, filters remaining

## Expected Behavior After Fix

1. **Articles from 2023** will be filtered out in Discover stage
2. **Any that slip through** will be filtered in Rank stage
3. **If >20% violations reach QA**, pipeline will fail with clear error message
4. **Remaining violations** will be filtered out before script binding

## Testing Recommendations

1. **Test with old articles**: Verify articles from 2023 are filtered
2. **Test with missing dates**: Verify articles without dates are skipped
3. **Test with invalid dates**: Verify articles with unparseable dates are skipped
4. **Test QA failure**: Verify pipeline fails when >20% violations
5. **Test edge cases**: Articles exactly at window boundaries

## Logging

All filtering actions are now logged:
- `Skipping article without publication date`
- `Skipping article outside time window`
- `Filtered evidence outside time window`
- `QA date sanity check failed` (when pipeline fails)

## Impact

- ✅ Old articles (like 2023) will be filtered out early
- ✅ QA stage now enforces time window (fails if too many violations)
- ✅ Evidence outside window is filtered before script binding
- ✅ Better error messages for debugging
- ✅ No breaking changes to API contracts

