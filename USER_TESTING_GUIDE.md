# 🧪 USER TESTING GUIDE - Real APIs Only

## **STATUS: Ready for Testing**

✅ **All mock data removed**
✅ **All auth fallbacks removed**  
✅ **All hardcoded competitors removed**
✅ **Deployed to AWS with NO test bypasses**

---

## **What Changed:**

### **1. API Lambda Functions**
- ❌ Removed: `|| 'test-user-123'` and `|| 'test-org-456'` fallbacks
- ✅ Now: **REQUIRES real Cognito authentication**
- ✅ Returns 401 if no valid JWT token

### **2. Competitor Suggestions**
- ❌ Removed: 40+ company hardcoded fallback map
- ✅ Now: **ONLY uses OpenAI GPT-4 API**
- ✅ Shows detailed error if API fails (no silent fallback)

### **3. Error Messages**
- Now show **REAL errors** from APIs
- Help debug actual issues
- No more fake success states

---

## **🎯 COMPREHENSIVE TEST PLAN**

### **IMPORTANT**: I will watch and fix issues as you test!

---

## **Test 1: Authentication** (5 minutes)

### **1.1 Sign Up**
```
URL: http://localhost:3001/auth/signup

Steps:
1. Enter email: [your-email]@gmail.com
2. Enter password: Test1234!
3. Enter name: Test User
4. Enter company: Test Company
5. Click "Sign Up"

Expected:
✅ Redirected to verify page
✅ Verification code sent to email

Actual Result:
[ ] Pass
[ ] Fail - Error: _______________
```

### **1.2 Email Verification**
```
Steps:
1. Check email inbox
2. Copy 6-digit code
3. Enter code
4. Click "Verify"

Expected:
✅ "Email Verified!" message
✅ Redirected to login

Actual Result:
[ ] Pass
[ ] Fail - Error: _______________
```

### **1.3 Login**
```
Steps:
1. Enter email
2. Enter password
3. Click "Sign In"

Expected:
✅ Redirected to /podcasts
✅ Navigation shows user name
✅ JWT token stored (check browser dev tools → Application → Session Storage)

Actual Result:
[ ] Pass
[ ] Fail - Error: _______________
```

### **1.4 Test Auth Enforcement**
```
Steps:
1. Log out
2. Try to access http://localhost:3001/podcasts directly
3. Check browser console

Expected:
✅ API calls return 401 Unauthorized
✅ Or redirected to login

Actual Result:
[ ] Pass
[ ] Fail - Error: _______________
```

---

## **Test 2: Competitor Suggestions (NO FALLBACK)** (10 minutes)

### **2.1 Test Common Company**
```
URL: http://localhost:3001/podcasts/new

Steps:
1. Navigate to Step 2
2. Type "Tesla" in company field
3. Wait for loading animation

Expected:
✅ Loading indicator shows
✅ AI generates 4-6 competitors (e.g., "Ford, GM, Rivian, BYD...")
✅ Competitors appear as checkboxes
✅ NO hardcoded fallback used

Actual Result:
Competitors shown: _______________
[ ] Pass
[ ] Fail - Error: _______________
```

### **2.2 Test Obscure Company**
```
Steps:
1. Clear field
2. Type "Accenture" (was in hardcoded map before)
3. Wait

Expected:
✅ AI generates competitors ("Deloitte, PwC, EY, KPMG...")
✅ Uses REAL OpenAI API, not fallback

Actual Result:
Competitors shown: _______________
[ ] Pass  
[ ] Fail - Error: _______________
```

### **2.3 Test Unknown/Gibberish**
```
Steps:
1. Type "XYZABC123NotARealCompany"
2. Wait

Expected:
⚠️ Error message shown (API couldn't find competitors)
⚠️ NO hardcoded fallback
⚠️ Clear error about OpenAI API

Actual Result:
Error message: _______________
[ ] Pass - Shows real error
[ ] Fail - Showed fake data or crashed
```

### **2.4 Test API Failure Handling**
```
Steps:
1. Disconnect internet
2. Type "Microsoft"
3. Wait

Expected:
❌ Network error message
❌ "Check API Gateway and Lambda deployment"
❌ NO fake competitor data

Actual Result:
Error message: _______________
[ ] Pass - Shows network error
[ ] Fail - Showed hardcoded data
```

---

## **Test 3: Voice Preview (Real OpenAI TTS)** (5 minutes)

### **3.1 Test Alloy Voice**
```
Steps:
1. Continue to Step 5
2. Click "Preview" on Alloy voice
3. Wait

Expected:
✅ Button shows "🔊 Playing..."
✅ Audio loads and plays
✅ Hear: "Welcome to your AI-powered podcast..."
✅ Real OpenAI TTS voice

Actual Result:
[ ] Pass - Heard AI voice
[ ] Fail - Error: _______________
```

### **3.2 Test All 6 Voices**
```
Steps:
1. Test Echo
2. Test Fable  
3. Test Nova
4. Test Onyx
5. Test Shimmer

Expected:
✅ Each voice sounds different
✅ All use real OpenAI TTS API
✅ No mock audio files

Actual Result:
Voices tested: ___/6
[ ] Pass - All worked
[ ] Fail - Which failed: _______________
```

---

## **Test 4: Create Podcast (Real DB Save)** (5 minutes)

### **4.1 Complete Full Flow**
```
Steps:
1. Fill all 5 steps
2. Select at least 2 competitors
3. Click "Create Podcast"
4. Wait for confirmation

Expected:
✅ "Podcast created successfully" message
✅ Redirected to podcast detail page
✅ Saved to DynamoDB with YOUR user ID (not test-user-123)

Actual Result:
Podcast ID: _______________
[ ] Pass
[ ] Fail - Error: _______________
```

### **4.2 Verify in Podcast List**
```
Steps:
1. Navigate to /podcasts
2. Check if new podcast appears

Expected:
✅ Shows in list with your title
✅ Shows correct company name
✅ Shows correct competitors

Actual Result:
[ ] Pass
[ ] Fail - Not in list
```

---

## **Test 5: Run Pipeline (Real OpenAI + Step Functions)** (30 minutes)

⚠️ **THIS WILL COST ~$1-2 in OpenAI API fees**

### **5.1 Trigger Pipeline**
```
Steps:
1. From podcast detail page
2. Click "Run Now"
3. Confirm

Expected:
✅ "Pipeline started" message
✅ Shows Run ID
✅ Redirected to run progress page

Actual Result:
Run ID: _______________
[ ] Pass
[ ] Fail - Error: _______________
```

### **5.2 Monitor Progress**
```
Steps:
1. Watch run progress page
2. Open browser dev tools → Network tab
3. Watch for API calls every 3s

Expected:
✅ Stage 1 (Prepare) completes first
✅ Stages progress one by one
✅ Real-time updates from DynamoDB
✅ Progress bars update
✅ Duration shows actual time

Actual Result (note which stages complete):
Stage 1 (Prepare): [ ] ✅ [ ] ❌
Stage 2 (Discover): [ ] ✅ [ ] ❌
Stage 3 (Disambiguate): [ ] ✅ [ ] ❌
Stage 4 (Rank): [ ] ✅ [ ] ❌
Stage 5 (Scrape): [ ] ✅ [ ] ❌
Stage 6 (Extract): [ ] ✅ [ ] ❌
Stage 7 (Summarize): [ ] ✅ [ ] ❌
Stage 8 (Contrast): [ ] ✅ [ ] ❌
Stage 9 (Outline): [ ] ✅ [ ] ❌
Stage 10 (Script): [ ] ✅ [ ] ❌
Stage 11 (QA): [ ] ✅ [ ] ❌
Stage 12 (TTS): [ ] ✅ [ ] ❌
Stage 13 (Package): [ ] ✅ [ ] ❌

First failure at stage: _______________
Error message: _______________
```

### **5.3 Check AWS CloudWatch Logs**
```
Steps:
1. Open AWS Console → CloudWatch → Log Groups
2. Find log group for failed stage
3. Check recent logs

Expected:
✅ Real error messages (not mock)
✅ OpenAI API calls visible
✅ Actual stack traces

Actual Result:
Error found: _______________
```

---

## **Test 6: Admin Console (Real DynamoDB)** (5 minutes)

### **6.1 View Running Pipeline**
```
Steps:
1. Open http://localhost:3001/admin (in new tab)
2. While pipeline running from Test 5

Expected:
✅ Your run appears in list
✅ Shows all 13 stages
✅ Progress bars match run page
✅ Auto-updates every 3s
✅ Stats show real numbers

Actual Result:
Run shown: Yes [ ] No [ ]
Stages visible: ___/13
Stats accurate: [ ] Yes [ ] No
```

### **6.2 After Pipeline Completes**
```
Expected:
✅ Run status changes to "completed" or "failed"
✅ Duration shows actual time
✅ Stats updated

Actual Result:
Final status: _______________
Duration: _______________ minutes
[ ] Pass
[ ] Fail
```

---

## **Test 7: Episode Playback** (5 minutes)

*Only if pipeline completed successfully*

### **7.1 Access Episode**
```
Steps:
1. Go to podcast detail
2. Click on generated episode
3. Check episode page

Expected:
✅ Audio player visible
✅ Play button works
✅ Transcript shows
✅ Show notes display
✅ Sources listed

Actual Result:
[ ] Pass - All displayed
[ ] Fail - Missing: _______________
```

---

## **📊 RESULTS SUMMARY**

Fill this out after testing:

```
==============================================
TEST RESULTS SUMMARY
==============================================

Total Tests: 7
Passed: ___/7
Failed: ___/7

Details:
1. Authentication: [ ] Pass [ ] Fail
2. Competitor AI: [ ] Pass [ ] Fail  
3. Voice Preview: [ ] Pass [ ] Fail
4. Create Podcast: [ ] Pass [ ] Fail
5. Run Pipeline: [ ] Pass [ ] Fail
6. Admin Console: [ ] Pass [ ] Fail
7. Episode Playback: [ ] Pass [ ] Fail

==============================================
CRITICAL ISSUES FOUND:
==============================================

Issue 1: _______________
Issue 2: _______________
Issue 3: _______________

==============================================
CONFIRMATION:
==============================================

[ ] I tested with REAL OpenAI API (saw charges)
[ ] I tested with REAL Cognito (required login)
[ ] I tested with REAL DynamoDB (no test-user-123)
[ ] No hardcoded/mock data was used
[ ] All errors were real API errors

==============================================
```

---

## **🚨 REPORT ISSUES TO ME**

After each test, report:
1. Test number
2. Pass/Fail
3. Exact error message
4. Screenshot if possible

I'll fix issues immediately and you can retest!

---

## **💰 Expected Costs**

For complete testing:
- Authentication: $0 (Cognito free tier)
- Competitor suggestions (10 tests): ~$0.30
- Voice previews (6 voices): ~$0.09
- Pipeline run (all 13 stages): ~$1.50

**Total: ~$2.00**

---

**START TESTING NOW! Report results as you go!** 🚀

