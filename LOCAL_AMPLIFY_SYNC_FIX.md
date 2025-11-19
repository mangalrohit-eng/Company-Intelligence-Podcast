# Local/Amplify Podcast Sync Fix

## Issue
Podcasts created on Amplify showed up in local, but podcasts created locally did NOT show up in Amplify.

## Root Cause
The local Next.js API route (`src/app/api/podcasts/route.ts`) was creating podcasts **without** the `orgId` field, while:
- The Lambda function (`src/api/podcasts/create.ts`) creates podcasts **with** `orgId`
- The Amplify frontend uses the Lambda function to list podcasts, which filters by `orgId`
- Therefore, locally created podcasts (without `orgId`) were invisible to Amplify

## Solution
Updated the local API route to:
1. **Extract authentication** from the `Authorization` header (Cognito JWT token)
2. **Decode the JWT** to get `userId` and `orgId` (or generate `orgId` for legacy users)
3. **Add `orgId` and `ownerUserId`** to podcasts when creating them locally

### Changes Made

1. **Added `extractAuthFromRequest()` function**:
   - Extracts JWT token from `Authorization: Bearer <token>` header
   - Decodes JWT payload (without verification for local dev)
   - Extracts `userId` from `sub` claim
   - Extracts `orgId` from `custom:org_id` claim, or generates `org-${userId}` for legacy users

2. **Updated `POST /api/podcasts` handler**:
   - Calls `extractAuthFromRequest()` to get auth context
   - Requires authentication (returns 401 if not authenticated)
   - Adds `orgId` and `ownerUserId` fields to the podcast object

### Code Changes

```typescript
// Helper to extract auth context from Next.js request
function extractAuthFromRequest(request: NextRequest): { userId: string; orgId: string } | null {
  // Extracts JWT from Authorization header
  // Decodes payload to get userId and orgId
  // Returns null if auth is missing/invalid
}

// In POST handler:
const auth = extractAuthFromRequest(request);
if (!auth) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

const podcast = {
  id: podcastId,
  orgId, // ✅ Now included
  ownerUserId: userId, // ✅ Now included
  // ... rest of fields
};
```

## Result
Now both local and Amplify-created podcasts:
- ✅ Have `orgId` field
- ✅ Show up in both environments
- ✅ Are properly filtered by organization

## Testing
1. Create a podcast locally (while logged in)
2. Check that it appears in Amplify
3. Create a podcast in Amplify
4. Check that it appears locally

Both should now work correctly!

