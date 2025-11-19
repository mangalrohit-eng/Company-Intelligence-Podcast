# Run Progress Structure Fix

## Issue
When clicking on a run in the runs tab, the browser console showed:
```
TypeError: Cannot read properties of undefined (reading 'stages')
```

## Root Cause
The run details page expected a `progress` object with a `stages` structure:
```typescript
progress: {
  currentStage: string;
  stages: Record<string, { status: string; startedAt?: string; completedAt?: string }>;
}
```

However, when creating a run, the Lambda function was only storing:
```typescript
{
  id: runId,
  podcastId,
  configVersion: podcast.currentConfigVersion,
  status: 'pending',
  createdAt: now,
  updatedAt: now,
}
```

There was no `progress` field, so when the frontend tried to access `run.progress.stages[stage.id]`, it failed because `run.progress` was `undefined`.

## Solution

### 1. Initialize Progress Structure in Lambda
Updated `src/api/runs/create.ts` to initialize runs with a complete progress structure:

```typescript
const initialStages = {
  prepare: { status: 'pending' },
  discover: { status: 'pending' },
  disambiguate: { status: 'pending' },
  rank: { status: 'pending' },
  scrape: { status: 'pending' },
  extract: { status: 'pending' },
  summarize: { status: 'pending' },
  contrast: { status: 'pending' },
  outline: { status: 'pending' },
  script: { status: 'pending' },
  qa: { status: 'pending' },
  tts: { status: 'pending' },
  package: { status: 'pending' },
};

const run = {
  id: runId,
  podcastId,
  configVersion: podcast.currentConfigVersion,
  status: 'pending',
  progress: {
    currentStage: 'prepare',
    stages: initialStages,
  },
  createdAt: now,
  updatedAt: now,
};
```

### 2. Updated Frontend to Use Direct Get Run Endpoint
Updated `src/app/podcasts/[id]/runs/[runId]/page.tsx` to:
- Use the direct `/runs/{runId}` endpoint instead of fetching all runs
- Add backward compatibility fallback to initialize progress structure if missing

## Result
- ✅ New runs are created with proper progress structure
- ✅ Run details page can access `run.progress.stages` without errors
- ✅ Backward compatibility for existing runs without progress structure
- ✅ More efficient API calls (direct get instead of fetching all runs)

## Testing
1. Create a new run in Amplify
2. Click on the run in the runs tab
3. Run details page should load without console errors
4. Progress stages should be visible and properly initialized

