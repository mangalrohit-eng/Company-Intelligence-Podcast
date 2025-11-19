# Run ID Undefined Fix

## Issue
When clicking "Run Now" on a podcast in Amplify, the URL shows `/runs/undefined` and displays "run not found" error.

## Root Cause
The frontend code expects `data.runId` from the create run API response, but the Lambda function was returning the run object with `id` field instead of `runId`.

### Frontend Code (expects `runId`):
```typescript
const data = await response.json();
toast.success('Pipeline Started', `Run ID: ${data.runId}. Redirecting to progress view...`);
window.location.href = `/podcasts/${podcast.id}/runs/${data.runId}`;
```

### Lambda Response (was returning `id`):
```typescript
return acceptedResponse({
  ...run,  // run has { id: runId, ... }
  executionArn: result.executionArn,
});
```

So `data.runId` was `undefined`, causing the URL to be `/runs/undefined`.

## Solution
Updated the Lambda function to include `runId` in the response for frontend compatibility:

```typescript
return acceptedResponse({
  ...run,
  runId: run.id, // ✅ Include runId for frontend compatibility
  executionArn: result.executionArn,
});
```

Now the response includes both `id` and `runId`, so the frontend can use `data.runId` as expected.

## Result
- ✅ Run ID is now properly extracted from the API response
- ✅ URL redirects to `/podcasts/{id}/runs/{runId}` with the correct run ID
- ✅ Run details page loads correctly

## Testing
1. Create a podcast in Amplify
2. Click "Run Now"
3. Should redirect to `/podcasts/{id}/runs/{actual-run-id}` (not `undefined`)
4. Run details page should load successfully

