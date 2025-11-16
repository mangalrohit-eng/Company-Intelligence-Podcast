# 🔍 Real vs Mock Data Audit

## Current Status: What's Real vs What's Hardcoded

---

## ✅ **REAL & WORKING**

### **1. Test Pipeline Page** ✅
- **Location**: `http://localhost:3000/test-pipeline`
- **Status**: **100% Real**
- Runs actual CLI commands via system calls
- Uses real OpenAI API when "Real AI Mode" selected
- Reads/writes actual files from `fixtures/` and `output/`
- **No mock data**

### **2. Pipeline Stages (Backend)** ✅
- **Location**: `src/engine/stages/*.ts`
- **Status**: **100% Real**
- All 13 stages are fully implemented
- Connect to real OpenAI API
- Real web scraping with Playwright
- Real file I/O and data processing
- **No mock data**

### **3. AWS Infrastructure** ✅
- **Status**: **100% Deployed**
- DynamoDB tables: `podcasts`, `episodes`, `runs`, `run_events`
- S3 buckets for media and RSS
- Lambda functions for API
- Step Functions state machine
- API Gateway endpoints
- CloudFront distribution
- **All real infrastructure**

### **4. CloudFront Website** ✅
- **URL**: https://dhycfwg0k4xij.cloudfront.net
- **Status**: **Production status page deployed**
- Shows real AWS infrastructure details
- Links to real AWS console
- **No mock data**

---

## ⚠️ **MOCK/HARDCODED** (Needs Fixing)

### **1. Admin Console** ❌
- **Location**: `src/app/admin/page.tsx`
- **Problem**: Shows hardcoded mock run data
```typescript
// Lines 68-122: Stub data
setActiveRuns([
  {
    id: 'run-001',
    podcastName: 'Tech Weekly',
    // ... hardcoded stages
  }
]);
```
- **Fix Needed**: Query real DynamoDB `runs` and `run_events` tables
- **Priority**: HIGH

---

### **2. Podcast Creation Wizard - Submission** ❌
- **Location**: `src/app/podcasts/new/page.tsx`
- **Problem**: Doesn't actually save to database
```typescript
// Line 77-80
const handleSubmit = async () => {
  // TODO: Submit to API
  console.log('Creating podcast:', formData);
};
```
- **Fix Needed**: Call `POST /api/podcasts` Lambda function
- **Priority**: HIGH

---

### **3. Competitor Suggestions** ⚠️
- **Location**: `src/app/podcasts/new/page.tsx`
- **Status**: **Partially Fixed** (Added Accenture)
- **Problem**: Still using hardcoded map, not AI
```typescript
// Lines 381-423: Hardcoded competitor map
const competitorMap: Record<string, string[]> = {
  'accenture': ['Deloitte', 'PwC', 'EY', 'KPMG'],
  // ... 40+ hardcoded companies
};
```
- **Fix Needed**: Call OpenAI API to suggest competitors dynamically
- **Priority**: MEDIUM
- **Current**: Works for ~40 companies, fails for others

---

### **4. "Run Now" Button** ❌
- **Location**: `src/app/podcasts/page.tsx`
- **Problem**: Shows alert instead of actually running
```typescript
// Line 149
alert('🚀 Starting pipeline...\n\nIn production, this would:...');
```
- **Fix Needed**: 
  1. Call `POST /api/podcasts/{id}/runs` Lambda
  2. Start Step Functions execution
  3. Navigate to live progress view
- **Priority**: HIGH

---

### **5. Podcast List** ⚠️
- **Location**: `src/app/podcasts/page.tsx`
- **Status**: **API call exists but no data**
```typescript
// Line 37: Real API call
const response = await fetch(`${apiUrl}/api/podcasts`);
```
- **Problem**: Lambda returns empty because nothing saved yet
- **Fix Needed**: Save podcasts from wizard first
- **Priority**: Depends on #2

---

### **6. Authentication** ❌
- **Locations**: 
  - `src/app/auth/login/page.tsx`
  - `src/app/auth/signup/page.tsx`
- **Problem**: All auth is TODO
```typescript
// TODO: Implement Cognito authentication
// TODO: Implement Google SSO via Cognito
// TODO: Implement Microsoft SSO via Cognito
```
- **Fix Needed**: Integrate AWS Cognito Hosted UI
- **Priority**: LOW (can work without auth for now)

---

### **7. Settings Page** ❌
- **Location**: `src/app/settings/page.tsx`
- **Problem**: All settings are client-side only, no persistence
- **Fix Needed**: Connect to DynamoDB user preferences table
- **Priority**: LOW

---

## 📊 **Summary**

| Component | Status | Priority |
|-----------|--------|----------|
| Test Pipeline | ✅ Real | - |
| Pipeline Stages | ✅ Real | - |
| AWS Infrastructure | ✅ Real | - |
| Admin Console | ❌ Mock | HIGH |
| Podcast Creation | ❌ No Save | HIGH |
| Competitor Suggestions | ⚠️ Hardcoded | MEDIUM |
| Run Now Button | ❌ Alert Only | HIGH |
| Podcast List | ⚠️ Empty | Depends |
| Authentication | ❌ TODO | LOW |
| Settings | ❌ No Persist | LOW |

---

## 🎯 **What Works Right Now**

### **You CAN:**
1. ✅ Create podcast configuration via UI wizard (stores in browser state)
2. ✅ Navigate to Test Pipeline page
3. ✅ Run ANY stage with real AI using CLI commands
4. ✅ View real output files
5. ✅ Generate complete podcasts using OpenAI API
6. ✅ Access AWS infrastructure via console

### **You CANNOT:**
1. ❌ Save podcast to database
2. ❌ Trigger pipeline run from UI button
3. ❌ View real active runs in Admin console
4. ❌ Get AI-generated competitor suggestions for unknown companies
5. ❌ See saved podcasts in dashboard

---

## 🚀 **Action Plan to Make Everything Real**

### **Phase 1: Core Functionality (Critical)**

#### **1. Podcast Creation → Database**
```typescript
// src/app/podcasts/new/page.tsx
const handleSubmit = async () => {
  const response = await fetch(`${apiUrl}/api/podcasts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  
  if (response.ok) {
    const { podcastId } = await response.json();
    router.push(`/podcasts/${podcastId}`);
  }
};
```

#### **2. Admin Console → Real Data**
```typescript
// src/app/admin/page.tsx
useEffect(() => {
  const fetchActiveRuns = async () => {
    const response = await fetch(`${apiUrl}/api/runs?status=active`);
    const data = await response.json();
    setActiveRuns(data.runs);
  };
  
  fetchActiveRuns();
  const interval = setInterval(fetchActiveRuns, 3000); // Poll every 3s
  return () => clearInterval(interval);
}, []);
```

#### **3. Run Now → Step Functions**
```typescript
// src/app/podcasts/page.tsx
const handleRunNow = async (podcastId: string) => {
  const response = await fetch(`${apiUrl}/api/podcasts/${podcastId}/runs`, {
    method: 'POST',
  });
  
  if (response.ok) {
    const { runId } = await response.json();
    router.push(`/podcasts/${podcastId}/runs/${runId}`);
  }
};
```

---

### **Phase 2: AI Enhancement (Important)**

#### **4. AI Competitor Suggestions**
```typescript
// New API endpoint: src/api/competitors/suggest.ts
export async function POST(req: Request) {
  const { companyName } = await req.json();
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'system',
      content: 'List 4-6 direct competitors for the given company.'
    }, {
      role: 'user',
      content: companyName
    }],
  });
  
  return Response.json({ 
    competitors: parseCompetitors(completion.choices[0].message.content) 
  });
}
```

---

### **Phase 3: Polish (Nice-to-have)**

#### **5. Authentication**
- Integrate Cognito Hosted UI
- Add protected routes
- User session management

#### **6. Settings Persistence**
- Save to DynamoDB user preferences table
- Sync across devices

---

## 💡 **Current Best Workflow**

### **For Real End-to-End AI Podcast:**

1. ✅ Open http://localhost:3000/podcasts/new
2. ✅ Fill in: "Accenture" (competitors auto-suggest now!)
3. ✅ Complete wizard (data stored in browser)
4. ✅ Go to http://localhost:3000/test-pipeline
5. ✅ Run stages with **Real AI Mode**:
   ```
   Stage 9: Outline → Real AI ($0.05)
   Stage 10: Script → Real AI ($0.10)
   Stage 12: TTS → Real AI ($0.50)
   ```
6. ✅ View generated content in `output/` folder
7. ✅ Play the audio file!

**Total Cost: ~$0.65**
**Total Time: ~5 minutes**
**Result: Real AI-generated podcast!**

---

## ✅ **Immediate Next Steps**

Want me to fix these in order?

1. **Connect podcast creation to DynamoDB** (15 min)
2. **Connect admin console to real runs** (20 min)
3. **Make "Run Now" button trigger Step Functions** (15 min)
4. **Add AI competitor suggestions** (10 min)

**Total: ~1 hour to make everything 100% real**

Which should I start with?

