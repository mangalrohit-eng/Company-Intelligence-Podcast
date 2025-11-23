# How Topics and Competitors Are Used in Ranking and Script Stages

## Overview

Topics and competitors flow through the pipeline and are used in multiple stages, particularly in **Ranking** and **Script** generation. Here's how:

---

## 📊 **Ranking Stage (Stage 4)**

### How Topics Are Used:

1. **Per-Topic Priority Queues**
   - Each discovered article has `topicIds` assigned during the Discover stage
   - The Rank stage creates **separate priority queues for each topic**
   - Articles are sorted by `rankScore` (Expected Info Gain / Cost) within each topic queue

   ```typescript
   // From rank.ts lines 86-92
   for (const topicId of item.topicIds) {
     if (!topicQueues.has(topicId)) {
       topicQueues.set(topicId, []);
     }
     topicQueues.get(topicId)!.push(rankedItem);
   }
   ```

2. **Topic-Based Scraping Targets**
   - The orchestrator uses topic queues to determine scraping targets
   - Each topic gets a target number of evidence units based on priority weights
   - Higher priority topics get more evidence units allocated

3. **Specificity Factor (S)**
   - The ranking algorithm includes a "Specificity" factor (S) that measures relevance to specific topics/entities
   - This helps prioritize articles that are highly relevant to the configured topics

### How Competitors Are Used:

**Competitors are NOT directly used in the Ranking stage**, but they influence:
- **Discovery stage**: Articles mentioning competitors are discovered
- **Entity linking**: Competitor names are identified as entities
- **Evidence extraction**: Evidence mentioning competitors is extracted

---

## 🎙️ **Script Stage (Stage 10)**

### How Topics Are Used:

1. **Topic Summaries Input**
   - The script stage receives `summaries: TopicSummary[]` - one summary per topic
   - Each summary contains:
     - Topic name
     - A paragraph describing the topic
     - One on-air stat
     - One short quote
   - These summaries are incorporated into the script narrative

   ```typescript
   // From script.ts - context construction
   Topic Summaries:
   ${summaries.map((s) => `${s.topicName}: ${s.paragraph}`).join('\n\n')}
   ```

2. **Thematic Outline**
   - The outline stage (before script) organizes content by topics
   - The script uses the outline's theme and sections to structure the narrative
   - Topics determine what content sections are included

### How Competitors Are Used:

1. **Competitor Contrasts Input**
   - The script stage receives `contrasts: CompetitorContrast[]` from the Contrast stage
   - Each contrast contains:
     - Topic ID
     - 1-2 sentences contrasting company vs competitors
     - Bound stat/quote as evidence
   
   ```typescript
   // From script.ts - context construction
   Competitor Contrasts:
   ${contrasts.map((c) => c.sentences.join(' ')).join('\n\n')}
   ```

2. **Incorporated into Narrative**
   - Competitor contrasts are seamlessly woven into the script
   - They provide comparative analysis between the company and its competitors
   - Used to create engaging, informative content for executives

---

## 🔄 **Full Flow**

### 1. **Prepare Stage**
   - Topics: Allocates evidence units and time budgets across topics based on priority weights
   - Competitors: Stored in config but not directly used here

### 2. **Discover Stage**
   - Topics: Articles are pre-classified to topics using embeddings
   - Competitors: Articles mentioning competitors are discovered

### 3. **Rank Stage** ⭐
   - **Topics**: Creates per-topic priority queues, sorts articles by rankScore within each topic
   - **Competitors**: Not directly used, but competitor-related articles are ranked

### 4. **Scrape Stage**
   - Topics: Uses topic queues to determine which articles to scrape
   - Competitors: Scrapes articles that mention competitors

### 5. **Extract Stage**
   - Topics: Evidence is organized by topic
   - Competitors: Extracts evidence mentioning competitors

### 6. **Summarize Stage**
   - Topics: Creates one summary per topic with stats and quotes
   - Competitors: Evidence mentioning competitors is included in topic summaries

### 7. **Contrast Stage** ⭐
   - Topics: Generates contrasts per topic
   - **Competitors**: Filters evidence by company vs competitors, generates 1-2 sentence contrasts

### 8. **Outline Stage**
   - Topics: Organizes content thematically by topics
   - Competitors: Includes competitor analysis sections in outline

### 9. **Script Stage** ⭐
   - **Topics**: Uses topic summaries and outline to structure narrative
   - **Competitors**: Incorporates competitor contrasts into the script

---

## 📝 **Example: How It All Comes Together**

### Input Configuration:
```json
{
  "topics": {
    "standard": [
      { "id": "company-news", "name": "Company News", "priority": 3 },
      { "id": "competitor-analysis", "name": "Competitive Intelligence", "priority": 2 }
    ]
  },
  "competitors": [
    { "id": "walmart", "name": "Walmart" },
    { "id": "target", "name": "Target" }
  ]
}
```

### In Ranking:
1. Articles are discovered and classified to topics
2. Articles mentioning "Walmart" or "Target" are included
3. Rank stage creates two queues:
   - `company-news` queue (sorted by rankScore)
   - `competitor-analysis` queue (sorted by rankScore)
4. Top-ranked articles from each queue are selected for scraping

### In Script:
1. **Topic Summaries** provide:
   - Company News: "Amazon announced Q4 earnings of $150B..."
   - Competitive Intelligence: "The e-commerce market saw..."

2. **Competitor Contrasts** provide:
   - "While Amazon reported strong growth, Walmart's online sales increased 12%..."
   - "Target's same-day delivery expansion contrasts with Amazon's Prime focus..."

3. **Script Stage** combines:
   - Topic summaries (main content)
   - Competitor contrasts (comparative analysis)
   - Thematic outline (structure)
   - Into a cohesive narrative script

---

## 🎯 **Key Takeaways**

1. **Topics** drive:
   - Evidence allocation (more priority = more evidence)
   - Content organization (per-topic summaries)
   - Script structure (thematic sections)

2. **Competitors** drive:
   - Discovery (find competitor-related news)
   - Contrast generation (company vs competitor analysis)
   - Script content (comparative insights)

3. **Both work together**:
   - Competitor contrasts are generated per topic
   - Script incorporates both topic summaries and competitor contrasts
   - Final narrative is structured by topics but enriched with competitive analysis

---

## 🔍 **Debugging**

To verify topics and competitors are being used:

1. **Check prepare_input.json**:
   ```json
   {
     "topics": {
       "standard": [
         { "id": "company-news", "priority": 3 },
         { "id": "competitor-analysis", "priority": 2 }
       ]
     },
     "competitors": [
       { "id": "walmart", "name": "Walmart" }
     ]
   }
   ```

2. **Check rank_output.json**:
   ```json
   {
     "topicQueues": {
       "company-news": [...ranked items...],
       "competitor-analysis": [...ranked items...]
     }
   }
   ```

3. **Check contrast_output.json**:
   ```json
   {
     "contrasts": [
       {
         "topicId": "competitor-analysis",
         "sentences": ["While Amazon...", "Walmart's strategy..."],
         "boundStatOrQuote": {...}
       }
     ]
   }
   ```

4. **Check script_output.json**:
   - Should include topic summaries in context
   - Should include competitor contrasts in context
   - Final narrative should reference both

