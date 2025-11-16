# 🚀 Quick Fix Implementation Plan

## Goal: End-to-End Real AI Podcast Creation via UI

---

## **Problem Identified:**
All AWS Lambda endpoints return `401 Unauthorized` because:
- They require Cognito userId/orgId (lines 22-30 in each Lambda)
- Frontend doesn't send auth tokens
- No login flow exists

---

## **Solution: Bypass Auth for Testing**

### **Changes to Make:**

#### **1. Update All Lambda Functions** (Bypass auth check)

Files to modify:
- `src/api/podcasts/create.ts`
- `src/api/podcasts/list.ts`
- `src/api/runs/create.ts`
- `src/api/episodes/get.ts`

Change:
```typescript
// OLD (lines 22-30):
const userId = event.requestContext.authorizer?.claims?.sub;
const orgId = event.requestContext.authorizer?.claims?.['custom:org_id'];

if (!userId || !orgId) {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: 'Unauthorized' }),
  };
}

// NEW (temporary bypass):
const userId = event.requestContext.authorizer?.claims?.sub || 'test-user-123';
const orgId = event.requestContext.authorizer?.claims?.['custom:org_id'] || 'test-org-456';

// Skip auth check for testing - TODO: Re-enable for production
```

#### **2. Update Frontend API URLs**

Files to modify:
- `src/app/podcasts/new/page.tsx` (line 80)
- `src/app/podcasts/page.tsx` (line 36)

Change:
```typescript
// OLD:
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const response = await fetch(`${apiUrl}/api/podcasts`, ...);

// NEW:
const apiUrl = 'https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com';
const response = await fetch(`${apiUrl}/podcasts`, ...);  // No /api prefix
```

#### **3. Redeploy Lambdas**

```bash
npm run deploy
```

---

## **Expected Result:**

✅ Create podcast via UI → Saves to DynamoDB
✅ View podcasts list → Fetches from DynamoDB  
✅ Click Run Now → Triggers Step Functions
✅ Admin console → Shows real runs
✅ Complete end-to-end flow!

---

## **Time Estimate:** 20 minutes

Want me to proceed with these changes?

