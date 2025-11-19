# Vercel Runs Visibility Fix

## Problem
Runs created on Vercel were not showing up in the runs list, even though they appeared locally. This was because runs were being stored in local file system (`data/runs.json`), which doesn't persist on Vercel's serverless functions.

## Solution
Updated the runs persistence layer to use DynamoDB for production (Vercel) while maintaining local file storage as a fallback for development.

## Changes Made

### 1. **src/lib/runs-persistence.ts** ✅
- **Updated `saveRun()`**: Now saves to DynamoDB when AWS credentials are available (Vercel), falls back to disk for local dev
- **Updated `getRunsForPodcast()`**: Now queries DynamoDB using the `PodcastIdIndex` GSI when AWS credentials are available
- **Added pagination**: Handles DynamoDB query pagination to fetch all runs
- **Status mapping**: Maps between our status values ('completed') and DynamoDB schema ('success')
- **Field mapping**: Handles both `finishedAt`/`completedAt` and `errorMessage`/`error` for compatibility

### 2. **src/app/api/podcasts/[id]/runs/route.ts** ✅
- **Updated GET endpoint**: Now uses DynamoDB-backed `getRunsForPodcast()` which automatically uses DynamoDB on Vercel
- **Conditional filesystem check**: Only checks local filesystem for audio files in local dev (not on Vercel)
- **Improved logging**: Shows whether runs are loaded from DynamoDB or disk

## How It Works

### On Vercel (Production)
1. When a run is created, `saveRun()` detects AWS credentials and saves to DynamoDB `runs` table
2. When fetching runs, `getRunsForPodcast()` queries DynamoDB using the `PodcastIdIndex` GSI
3. Runs are stored with:
   - `id` (partition key)
   - `podcastId` (GSI partition key for querying)
   - `status` (mapped: 'completed' → 'success')
   - `progress`, `output`, etc.

### On Local Development
1. Falls back to local file storage (`data/runs.json`) when AWS credentials are not available
2. Maintains backward compatibility with existing local runs

## Status Field Mapping

| Our Code | DynamoDB Schema |
|----------|----------------|
| `completed` | `success` |
| `failed` | `failed` |
| `running` | `running` |
| `pending` | `pending` |

## Field Name Mapping

| Our Code | DynamoDB Schema | Notes |
|----------|----------------|-------|
| `completedAt` | `finishedAt` | Both stored for compatibility |
| `error` | `errorMessage` | Both stored for compatibility |

## Testing

### To Verify on Vercel:
1. Create a new run on Vercel
2. Check Vercel function logs for: `✅ Saved run {runId} to DynamoDB`
3. Check runs list - should show the new run
4. Check Vercel function logs for: `✅ Fetched {count} runs from DynamoDB for podcast {podcastId}`

### To Verify Locally:
1. Create a new run locally (without AWS credentials)
2. Check that it's saved to `data/runs.json`
3. Check runs list - should show the run

## Important Notes

### Existing Runs
- **Runs created before this fix** on Vercel may not be in DynamoDB (they were trying to save to disk which failed silently)
- **New runs** created after this fix will be saved to DynamoDB and will be visible
- **Local runs** remain in `data/runs.json` and continue to work

### Migration
If you need to migrate existing runs to DynamoDB, you would need to:
1. Export runs from local `data/runs.json`
2. Import them into DynamoDB using a script
3. This is optional - only needed if you want historical runs on Vercel

## DynamoDB Table Structure

- **Table Name**: `runs`
- **Partition Key**: `id` (string)
- **GSI**: `PodcastIdIndex`
  - **Partition Key**: `podcastId` (string)
  - Used for querying all runs for a specific podcast

## Error Handling

- If DynamoDB save fails, falls back to disk (local dev only)
- If DynamoDB query fails, falls back to disk (local dev only)
- Enhanced error logging shows table name, index name, and error details

---

**Status**: ✅ Complete
**Date**: Now
**Impact**: Runs are now visible on Vercel deployments

