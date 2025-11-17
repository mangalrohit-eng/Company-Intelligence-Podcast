# 🔍 Comprehensive Testing Audit - Real APIs Only

## **Audit Started**: [Current Session]
## **Goal**: Remove ALL mock/hardcoded data, test with REAL AWS & OpenAI APIs only

---

## **Phase 1: Code Audit - Mock Data Found**

### ✅ **Issues Found:**

#### **1. API Endpoints - Test User Fallbacks**
**Location**: `src/api/podcasts/create.ts`
```typescript
const userId = event.requestContext.authorizer?.claims?.sub || 'test-user-123';
const orgId = event.requestContext.authorizer?.claims?.['custom:org_id'] || 'test-org-456';
```
**Status**: ⚠️ Allows testing without auth
**Fix Needed**: Remove fallback, require real auth

---

**Location**: `src/api/podcasts/list.ts`
```typescript
// TEMPORARY BYPASS FOR TESTING
const orgId = event.requestContext.authorizer?.claims?.['custom:org_id'] || 'test-org-456';
// Auth check disabled for testing
```
**Status**: ⚠️ Auth check commented out
**Fix Needed**: Re-enable auth check

---

**Location**: `src/api/runs/create.ts`
```typescript
// TEMPORARY BYPASS FOR TESTING
const orgId = event.requestContext.authorizer?.claims?.['custom:org_id'] || 'test-org-456';
```
**Status**: ⚠️ Auth bypass
**Fix Needed**: Remove fallback

---

#### **2. Frontend - Hardcoded Competitor Map**
**Location**: `src/app/podcasts/new/page.tsx` (lines 407-450)
```typescript
const competitorMap: Record<string, string[]> = {
  'accenture': ['Deloitte', 'PwC', 'EY', 'KPMG', ...],
  'verizon': ['AT&T', 'T-Mobile', ...],
  // ... 40+ hardcoded companies
};

// Used as fallback when API fails
const competitors = competitorMap[normalized] || [];
```
**Status**: ⚠️ Hardcoded fallback prevents testing real API failures
**Fix Needed**: Comment out fallback, force real API or error

---

## **Phase 2: Removing Mock Data**

### **Changes to Make:**

1. ✅ Remove auth fallbacks in API handlers
2. ✅ Re-enable auth checks
3. ✅ Comment out hardcoded competitor map
4. ✅ Remove any test data bypasses

---

## **Phase 3: Testing Plan**

### **Test 1: Authentication Flow** ⏳
- [ ] Sign up with real email
- [ ] Receive verification code
- [ ] Verify email
- [ ] Login
- [ ] Verify JWT token in requests
- [ ] Test protected route without token (should fail)
- [ ] Test protected route with token (should work)

### **Test 2: Create Podcast - Competitor Suggestions** ⏳
- [ ] Navigate to /podcasts/new
- [ ] Type "Tesla" (not in hardcoded map)
- [ ] Verify real OpenAI API call
- [ ] Verify competitors appear from GPT-4
- [ ] Type "NonexistentCompany123"
- [ ] Verify graceful error handling

### **Test 3: Voice Preview** ⏳
- [ ] Click "Preview" on Alloy voice
- [ ] Verify Lambda calls OpenAI TTS API
- [ ] Verify audio returns and plays
- [ ] Test all 6 voices
- [ ] Verify loading states
- [ ] Verify error handling if API fails

### **Test 4: Create Podcast - Full Flow** ⏳
- [ ] Complete all 5 steps
- [ ] Submit podcast
- [ ] Verify saved to DynamoDB with real user ID
- [ ] Verify appears in podcast list
- [ ] Check all fields saved correctly

### **Test 5: Run Pipeline** ⏳
- [ ] Click "Run Now"
- [ ] Verify Step Functions triggered
- [ ] Check Stage 1: Prepare
- [ ] Check Stage 2: Discover (with real OpenAI)
- [ ] Check Stage 3: Disambiguate
- [ ] Check Stage 4: Rank
- [ ] Check Stage 5: Scrape
- [ ] Check Stage 6: Extract (with real OpenAI)
- [ ] Check Stage 7: Summarize (with real OpenAI)
- [ ] Check Stage 8: Contrast (with real OpenAI)
- [ ] Check Stage 9: Outline (with real OpenAI)
- [ ] Check Stage 10: Script (with real OpenAI)
- [ ] Check Stage 11: QA (with real OpenAI)
- [ ] Check Stage 12: TTS (with real OpenAI)
- [ ] Check Stage 13: Package
- [ ] Verify audio file generated
- [ ] Verify RSS item created

### **Test 6: Admin Console** ⏳
- [ ] Open /admin while pipeline running
- [ ] Verify run appears from DynamoDB
- [ ] Verify stages update in real-time
- [ ] Verify progress bars accurate
- [ ] Verify stats calculated correctly
- [ ] Test auto-refresh (3s polling)

### **Test 7: Episode Playback** ⏳
- [ ] Navigate to episode detail page
- [ ] Play audio file
- [ ] Verify transcript displays
- [ ] Verify show notes display
- [ ] Verify sources display

---

## **Phase 4: Issues Found During Testing**

### **Will Document Here:**
- ❌ Issue 1: [Description]
  - Error: [Error message]
  - Fix: [What needs to be done]
  - Status: [Fixed/Pending]

- ❌ Issue 2: [Description]
  - Error: [Error message]
  - Fix: [What needs to be done]
  - Status: [Fixed/Pending]

---

## **Phase 5: Final Verification**

After all fixes:
- [ ] Re-test every failed case
- [ ] Verify no mock data remains
- [ ] Verify all APIs use real OpenAI
- [ ] Verify all data from real DynamoDB
- [ ] Verify all auth from real Cognito
- [ ] Document final status

---

## **OpenAI API Usage Tracking**

### **Expected Costs for Full Test:**
- Competitor suggestions (5 companies): ~$0.15
- Voice previews (6 voices): ~$0.09
- Pipeline discover stage: ~$0.25
- Pipeline extract stage: ~$0.30
- Pipeline summarize stage: ~$0.20
- Pipeline contrast stage: ~$0.20
- Pipeline outline stage: ~$0.15
- Pipeline script stage: ~$0.50
- Pipeline QA stage: ~$0.30
- Pipeline TTS stage: ~$0.75

**Total Expected**: ~$3.00 for complete end-to-end test

---

## **Final Status Report**

### **After Testing Complete:**

**Total Features Tested**: [X]
**Features Working**: [X]
**Features Failed**: [X]
**Mock Data Removed**: [X]
**Real APIs Verified**: [X]

**Confidence Level**: [0-100%]

---

**Status**: 🟡 IN PROGRESS
**Next Step**: Remove mock data and begin testing

