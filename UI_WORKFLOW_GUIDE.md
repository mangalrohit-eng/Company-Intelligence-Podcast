# 🎨 UI Workflow: Create & Run Podcasts from the Browser

## Complete Step-by-Step Guide

---

## **Step 1: Create Your Podcast Configuration**

### 1.1 Access the New Podcast Wizard

Open your browser to: **http://localhost:3000/podcasts/new**

Or click:
- **"Get Started"** button from homepage
- **"New Podcast"** from the podcasts page

---

### 1.2 Complete the 4-Step Wizard

#### **📝 Page 1: Basic Information**

![Step 1](Basic Info)

- **Podcast Title**: `"Verizon Intelligence Podcast"`
- **Description**: `"AI-generated weekly analysis of Verizon's market position and competitive landscape"`
- **🔽 Click "Next"**

---

#### **🏢 Page 2: Company & Competitors**

![Step 2](Company Selection)

1. **Company Name**: Start typing `"Verizon"`
   - ✨ AI will auto-suggest competitors
   - You'll see: AT&T, T-Mobile, Dish Network, Charter Communications

2. **Select Competitors**: Check 2-3 boxes
   - ✅ AT&T
   - ✅ T-Mobile
   - ✅ Dish Network

3. **Industry**: Select from dropdown
   - Choose: `"Telecommunications"`

4. **🔽 Click "Next"**

💡 **Tip**: The competitor suggestion happens automatically as you type!

---

#### **📰 Page 3: Topics & Sources**

![Step 3](Topics)

**Select Topics to Track:**
- ✅ 5G Network Expansion
- ✅ Market Performance & Stock
- ✅ Regulatory & Policy Changes
- ✅ Customer Experience & Service
- ✅ Competitive Landscape

**News Sources** (optional - defaults included):
- Reuters Business
- TechCrunch
- FCC Filings
- SEC Filings
- Industry trades

5. **🔽 Click "Next"**

---

#### **⚙️ Page 4: Podcast Configuration**

![Step 4](Configuration)

**Duration:**
- Select: `5 minutes` (recommended for first test)
- Options: 2, 5, 10, 15, 20, 30 minutes

**Voice & Style:**
- Voice: `"Alloy"` (professional, neutral)
- Tone: `"Professional & Informative"`

**Publishing:**
- Schedule: `Manual` (run on-demand)
- Auto-publish: `Off` (review first)

6. **🎉 Click "Create Podcast"**

---

### 1.3 Podcast Created!

You'll be redirected to:
```
http://localhost:3000/podcasts/[your-podcast-id]
```

You should see:
- ✅ Podcast overview
- 📊 Tabs: Overview | Episodes | Runs | Settings
- 🎯 **"Run Now"** button (we'll use this next!)

---

## **Step 2: Run Your Podcast**

### Current Options:

---

### **Option A: Test Pipeline Page (Interactive Stage-by-Stage)**

This is the **best UI option** for learning and testing!

#### 1. Navigate to Test Pipeline
```
http://localhost:3000/test-pipeline
```

#### 2. Run Stages One-by-One

![Test Pipeline](Stage Selection)

**Stage Selector:**
- Choose: `Stage 1: Prepare`

**Quick Mode Toggle:**
- **Free Mode** (No API costs): Uses stub/replay
- **Real AI Mode** (Uses OpenAI): Costs money

**File Paths:**
- Input: `fixtures/prepare/in.json` (auto-filled)
- Output: `output/prepare_output.json` (auto-filled)

#### 3. Click "Run Stage"

You'll see:
- ⏱️ Running animation
- ✅ Success message
- 📊 Duration: X seconds
- 📄 **Clickable file links** to view input/output

#### 4. Repeat for Each Stage

Run stages in sequence:
1. ✅ Prepare → Budget allocations
2. ✅ Discover → Find news
3. ✅ Disambiguate → Filter entities
4. ✅ Rank → Prioritize sources
5. ✅ Scrape → Fetch content
6. ✅ Extract → Get evidence
7. ✅ Summarize → Create summaries
8. ✅ Contrast → Compare competitors
9. ✅ Outline → Build structure
10. ✅ Script → Write narrative
11. ✅ QA → Verify facts
12. ✅ TTS → Generate audio
13. ✅ Package → Create deliverables

**💡 Best Practice:**
- Start in **Free Mode** to test the flow
- Switch to **Real AI Mode** for stages 9-12 (Outline, Script, QA, TTS)

---

### **Option B: Admin Console (Monitor Real-Time)**

For monitoring pipeline execution:

#### 1. Navigate to Admin
```
http://localhost:3000/admin
```

#### 2. View Pipeline Status

You'll see all 13 stages with:
- 🟢 Status indicators (Pending, Running, Complete, Error)
- 📊 Progress bars
- ⏱️ Duration tracking
- 💬 Real-time messages
- ❌ Error details (if any)

#### 3. Monitor Execution

Watch as stages complete:
```
Stage 1: Prepare       ✅ Complete (2.3s)
Stage 2: Discover      🔄 Running... 45%
Stage 3: Disambiguate  ⏳ Pending
...
```

---

### **Option C: Podcasts Dashboard (View Results)**

After pipeline completes:

#### 1. Navigate to Podcasts
```
http://localhost:3000/podcasts
```

#### 2. Click Your Podcast

You'll see:
- **Overview Tab**: Stats and info
- **Episodes Tab**: Completed podcasts with audio player
- **Runs Tab**: Execution history

#### 3. View Episode

Click on an episode to see:
- 🎵 Audio player (play the podcast!)
- 📝 Full transcript
- 📄 Show notes with sources
- 🔗 Source links

---

## **Complete UI Workflow Example**

### **Scenario: Create & Run a Verizon Podcast**

#### **Part 1: Create Configuration (3 minutes)**

1. **Go to** http://localhost:3000/podcasts/new

2. **Fill out wizard:**
   ```
   Page 1: Title = "Verizon Weekly Intelligence"
   Page 2: Company = "Verizon", Competitors = [AT&T, T-Mobile]
   Page 3: Topics = [5G, Market Performance, Regulatory]
   Page 4: Duration = 5 min, Voice = Alloy
   ```

3. **Click "Create Podcast"**

4. ✅ **Podcast created!** Note the ID from URL

---

#### **Part 2: Run Pipeline (10 minutes)**

**Option 2A: Quick Free Test**

1. **Go to** http://localhost:3000/test-pipeline

2. **Run 3 stages in Free Mode:**
   - Stage 1: Prepare (Free Mode) → Click "Run Stage"
   - Stage 7: Summarize (Free Mode) → Click "Run Stage"
   - Stage 10: Script (Free Mode) → Click "Run Stage"

3. **View results** by clicking output file links

---

**Option 2B: Real AI Run**

1. **Still on** http://localhost:3000/test-pipeline

2. **Switch to Real AI Mode** (toggle at top)

3. **Run key stages:**
   - Stage 9: Outline (Real AI) → Click "Run Stage" (30s, $0.05)
   - Stage 10: Script (Real AI) → Click "Run Stage" (45s, $0.10)

4. **View AI-generated content** in output files

---

#### **Part 3: View Results**

1. **Go to** http://localhost:3000/podcasts

2. **Click your podcast**

3. **Check "Runs" tab** to see execution history

4. **Check "Episodes" tab** when complete

---

## **🎯 Recommended First UI Experience**

### **The "5-Minute Test"**

1. ✅ **Create podcast** via wizard (2 min)
2. ✅ **Go to Test Pipeline** page
3. ✅ **Run Stage 1 (Prepare)** in Free Mode
4. ✅ **Click output file link** to see budget JSON
5. ✅ **Run Stage 10 (Script)** in Free Mode
6. ✅ **View generated script** in output file

**Total time: 5 minutes, Cost: $0**

---

### **The "Real AI Experience"**

1. ✅ **Create podcast** via wizard (2 min)
2. ✅ **Go to Test Pipeline** page
3. ✅ **Toggle "Real AI Mode"**
4. ✅ **Run Stage 9 (Outline)** with input: `fixtures/summarize/out.json`
5. ✅ **Run Stage 10 (Script)** with input: `output/outline_output.json`
6. ✅ **View AI-generated script**

**Total time: 5 minutes, Cost: ~$0.15**

---

## **Current Limitations**

### **Working ✅**
- ✅ Create podcast configuration via UI wizard
- ✅ Test Pipeline page to run individual stages
- ✅ View input/output files directly
- ✅ Toggle between Free and Real AI modes
- ✅ Admin console for monitoring
- ✅ Podcasts dashboard for viewing results

### **Coming Soon ⏳**
- ⏳ "Run Now" button to trigger full pipeline from UI
- ⏳ Direct AWS Step Functions integration
- ⏳ Real-time progress updates during execution
- ⏳ Episode audio player (requires TTS completion)
- ⏳ Automatic database persistence

**Note:** For now, the **Test Pipeline** page is your primary UI tool!

---

## **📸 What You'll See**

### **Test Pipeline Page**

```
╔════════════════════════════════════════════════╗
║  🧪 Test Pipeline - Run Individual Stages     ║
╠════════════════════════════════════════════════╣
║                                                ║
║  Quick Mode:  [🆓 Free Mode] [🤖 Real AI]     ║
║                                                ║
║  Select Stage: [Stage 1: Prepare ▼]           ║
║                                                ║
║  Input File:  fixtures/prepare/in.json        ║
║  Output File: output/prepare_output.json      ║
║                                                ║
║  [▶ Run Stage]                                ║
║                                                ║
║  ✅ Success! Completed in 1.2s                ║
║  📄 View Input  |  📄 View Output             ║
║                                                ║
║  Command Preview:                              ║
║  npm run run-stage -- --stage prepare ...     ║
║                                                ║
╚════════════════════════════════════════════════╝
```

---

## **🎉 You're Ready!**

**Start here:**
1. Create podcast: http://localhost:3000/podcasts/new
2. Test pipeline: http://localhost:3000/test-pipeline
3. Monitor: http://localhost:3000/admin

**Your podcast platform is fully operational via the UI! 🚀**

