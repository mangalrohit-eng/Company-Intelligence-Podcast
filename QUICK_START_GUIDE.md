# 🎙️ Quick Start: Create Your First Podcast

## Overview
This guide walks you through creating an AI-generated company intelligence podcast from start to finish.

---

## 🚀 Step-by-Step Guide

### **Step 1: Access the Platform**

Open your browser to: **http://localhost:3000**

✅ You should see the landing page with "Turn Your Company News Into a Podcast"

---

### **Step 2: Create a New Podcast**

1. Click **"Get Started"** or navigate to **http://localhost:3000/podcasts/new**

2. **Configure Your Podcast** (4-step wizard):

   **📋 Step 1: Basic Info**
   - **Title**: "Verizon Intelligence Weekly"
   - **Description**: "Weekly analysis of Verizon's market moves and competitive landscape"
   - Click **Next →**

   **🏢 Step 2: Company & Industry**
   - **Company**: Type "Verizon" 
   - ✨ AI will suggest competitors: AT&T, T-Mobile, Dish Network, Charter
   - ✅ Check 2-3 competitors you want to track
   - **Industry**: Select "Telecommunications"
   - Click **Next →**

   **📰 Step 3: Topics & Sources**
   - Select topics to track (e.g., "5G Rollout", "Market Performance", "Regulatory Changes")
   - Add news sources (optional - defaults are already configured)
   - Click **Next →**

   **⚙️ Step 4: Configuration**
   - **Duration**: 5 minutes (recommended for first test)
   - **Voice**: Select preferred TTS voice
   - **Schedule**: Manual (for now)
   - Click **Create Podcast**

3. ✅ **Your podcast is now created!**
   - You'll be redirected to the podcast dashboard
   - Note the Podcast ID (e.g., `podcast_abc123`)

---

### **Step 3: Run the Pipeline**

You have **3 options** to run a podcast:

---

#### **Option A: Test Pipeline UI (Recommended for Learning)**

1. Navigate to **http://localhost:3000/test-pipeline**

2. **Test Individual Stages:**
   ```
   Stage 1: Prepare    → Set up budgets and config
   Stage 2: Discover   → Find news articles
   Stage 3: Disambiguate → Filter relevant items
   ...
   Stage 13: Package   → Generate final podcast
   ```

3. **Run Each Stage:**
   - Select stage from dropdown
   - Choose mode: "Free Mode" (no API costs) or "Real AI Mode" (uses OpenAI)
   - Click **Run Stage**
   - View input/output files

**🎯 Recommended First Test:**
```bash
# Run a few stages in sequence to understand the flow:
npm run run-stage -- --stage prepare --llm stub
npm run run-stage -- --stage discover --llm stub --http replay
npm run run-stage -- --stage summarize --llm stub
```

---

#### **Option B: CLI Full Pipeline (Recommended for Production)**

**🆓 FREE Mode (No API Costs)**
```bash
npm run run-stage -- --stage prepare --llm stub
npm run run-stage -- --stage discover --llm stub --http replay
npm run run-stage -- --stage disambiguate --llm stub
npm run run-stage -- --stage rank --llm stub
npm run run-stage -- --stage scrape --http replay
npm run run-stage -- --stage extract --llm stub
npm run run-stage -- --stage summarize --llm stub
npm run run-stage -- --stage contrast --llm stub
npm run run-stage -- --stage outline --llm stub
npm run run-stage -- --stage script --llm stub
npm run run-stage -- --stage qa --llm stub
npm run run-stage -- --stage tts --tts stub
npm run run-stage -- --stage package
```

**🤖 REAL AI Mode (Uses OpenAI - ~$1.25 cost)**

**Prerequisites:**
- Add OpenAI API key to `.env`:
  ```bash
  OPENAI_API_KEY=sk-your-key-here
  ```

**Run stages:**
```bash
npm run run-stage -- --stage prepare --llm openai
npm run run-stage -- --stage discover --llm openai --http playwright
npm run run-stage -- --stage disambiguate --llm openai
npm run run-stage -- --stage rank --llm openai
npm run run-stage -- --stage scrape --http playwright
npm run run-stage -- --stage extract --llm openai
npm run run-stage -- --stage summarize --llm openai
npm run run-stage -- --stage contrast --llm openai
npm run run-stage -- --stage outline --llm openai
npm run run-stage -- --stage script --llm openai
npm run run-stage -- --stage qa --llm openai
npm run run-stage -- --stage tts --tts openai
npm run run-stage -- --stage package
```

**⚡ Quick Demo (2 stages only):**
```bash
npm run run-stage -- --stage outline --llm openai --in fixtures/summarize/out.json
npm run run-stage -- --stage script --llm openai --in fixtures/outline/out.json
```

💡 **This runs real OpenAI and costs ~$0.20**

---

#### **Option C: AWS Step Functions (Full Production)**

**Coming Soon** - Requires fixing orchestrator type issues

Navigate to AWS Console:
```
https://console.aws.amazon.com/states/home?region=us-east-1
```

1. Select `podcast-pipeline` state machine
2. Click **Start execution**
3. Provide input JSON:
   ```json
   {
     "podcastId": "podcast_abc123",
     "runId": "run_xyz789",
     "companyName": "Verizon",
     "duration": 5
   }
   ```
4. Monitor execution in real-time

---

### **Step 4: View Results**

#### **Check Output Files**

All stages write to `output/` directory:
```
output/
  ├── prepare_output.json      # Budget allocations
  ├── discover_output.json     # Found news items
  ├── extract_output.json      # Evidence units
  ├── summarize_output.json    # Topic summaries
  ├── script_output.json       # Final script
  ├── audio.mp3               # Generated audio
  └── show_notes.md           # Podcast notes
```

#### **Access via UI**

1. Go to **http://localhost:3000/podcasts**
2. Click on your podcast
3. View **Episodes** tab for completed podcasts
4. View **Runs** tab for pipeline execution history

---

## 🎯 Recommended First Run

**For your first podcast, follow this simple workflow:**

### **1. Quick Test (Free, 2 minutes)**
```bash
# Test a couple stages with stub mode
npm run run-stage -- --stage prepare --llm stub
npm run run-stage -- --stage summarize --llm stub --in fixtures/extract/out.json
```

✅ **Success!** You'll see output in `output/` folder

---

### **2. Real AI Test (Costs ~$0.20, 5 minutes)**
```bash
# Make sure OPENAI_API_KEY is in .env
npm run run-stage -- --stage outline --llm openai --in fixtures/summarize/out.json
npm run run-stage -- --stage script --llm openai --in fixtures/outline/out.json
```

✅ **Success!** You'll get a real AI-generated podcast script

---

### **3. Full Pipeline (Costs ~$1.25, 15-20 minutes)**

Run all 13 stages in sequence using the commands from Option B above.

✅ **Success!** Complete podcast with:
- Audio file (MP3)
- Transcript (VTT + TXT)
- Show notes
- RSS feed item

---

## 📊 What Each Stage Does

| Stage | Purpose | Input | Output |
|-------|---------|-------|--------|
| **1. Prepare** | Calculate budgets | Config | Budgets per topic |
| **2. Discover** | Find news | Topics | Discovery items |
| **3. Disambiguate** | Filter entities | Items | Filtered items |
| **4. Rank** | Prioritize sources | Items | Ranked queue |
| **5. Scrape** | Fetch content | URLs | Raw HTML |
| **6. Extract** | Get evidence | HTML | Evidence units |
| **7. Summarize** | Create summaries | Evidence | Topic summaries |
| **8. Contrast** | Compare competitors | Summaries | Contrasts |
| **9. Outline** | Build structure | Summaries | Outline |
| **10. Script** | Write narrative | Outline | Script |
| **11. QA** | Verify facts | Script | Verified script |
| **12. TTS** | Generate audio | Script | MP3 file |
| **13. Package** | Create deliverables | All | RSS + notes |

---

## 🐛 Troubleshooting

### **Issue: "OpenAI API key required"**
✅ **Fix:** Add to `.env` file:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

### **Issue: "Input file not found"**
✅ **Fix:** Either:
- Run previous stage first, OR
- Use `--in fixtures/<stage>/in.json` to use example data

### **Issue: "Stage failed with error"**
✅ **Fix:** Check `output/<stage>_error.log` for details

### **Issue: UI shows no podcasts**
✅ **Fix:** Backend API not connected yet. Use CLI workflow for now.

---

## 💡 Tips & Best Practices

1. **Start Small**: Test with 2-3 stages before running full pipeline
2. **Use Fixtures**: Pre-built example data in `fixtures/` folder
3. **Check Output**: Each stage writes to `output/` - verify before next stage
4. **Free Testing**: Use `--llm stub` and `--http replay` to avoid API costs
5. **Real AI**: Switch to `--llm openai` only when ready to spend ~$1.25
6. **Duration**: Start with 5 minutes, then try longer podcasts

---

## 🎉 Next Steps

After creating your first podcast:

1. ✅ **Customize Topics**: Add industry-specific topics
2. ✅ **Add Competitors**: Track more companies
3. ✅ **Adjust Duration**: Try 10-15 minute podcasts
4. ✅ **Schedule Runs**: Set up automated weekly runs
5. ✅ **Deploy Frontend**: Complete Next.js build for CloudFront

---

## 📞 Need Help?

- Check `HOW_TO_RUN_A_PODCAST.md` for detailed mode explanations
- Review `Readme.md` for architecture overview
- View `TESTING_STRATEGY.md` for unit test info
- See `output/` folder for stage outputs

**Your platform is ready to generate podcasts! 🎙️**

