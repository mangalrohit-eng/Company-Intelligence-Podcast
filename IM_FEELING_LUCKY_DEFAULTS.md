# "I'm Feeling Lucky" Button - Default Configuration

When you click the **"I'm Feeling Lucky"** button and enter just a company name, here are all the default values that are automatically set:

## 📋 Complete Default Configuration

### 🏷️ Branding & Metadata

| Field | Default Value |
|-------|--------------|
| **Title** | `{CompanyName} Intelligence Briefing` |
| **Subtitle** | `Daily insights for {CompanyName}` |
| **Description** | `Stay ahead of the curve with AI-powered intelligence briefings tailored for {CompanyName}. Get daily updates on industry trends, competitor moves, and market insights.` |
| **Author** | Company name (same as input) |
| **Email** | User's email from authentication (if available) |
| **Category** | `Business` |
| **Language** | `en` (English) |
| **Explicit** | `false` (No) |

### 🏢 Company & Industry

| Field | Default Value |
|-------|--------------|
| **Company ID** | Company name (as entered) |
| **Industry** | `technology` (Technology) |
| **Competitors** | `[]` (Empty array - none selected) |

### ⏰ Cadence & Schedule

| Field | Default Value |
|-------|--------------|
| **Cadence** | `daily` |
| **Duration** | `5` minutes |
| **Publish Time** | `09:00` (9:00 AM) |
| **Timezone** | User's local timezone (auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`) |
| **Time Window** | `24` hours |

### 📰 Topics & Coverage

| Field | Default Value |
|-------|--------------|
| **Topics** | `['company-news', 'competitor-analysis', 'industry-trends']` |
| **Topic Priorities** | |
|   - `company-news` | Priority: `3` (highest) |
|   - `competitor-analysis` | Priority: `2` |
|   - `industry-trends` | Priority: `2` |
| **Regions** | `['US']` |
| **Source Languages** | `['en']` (English) |
| **Robots Mode** | `strict` (respects robots.txt) |
| **Allow Domains** | `[]` (Empty - no whitelist) |
| **Block Domains** | `[]` (Empty - no blacklist) |

### 🎙️ Voice & Audio

| Field | Default Value |
|-------|--------------|
| **Voice ID** | `alloy` (OpenAI TTS voice) |
| **Voice Speed** | `1.0` (normal speed) |
| **Voice Tone** | `professional` |

---

## 📝 Example

If you enter **"Verizon"** as the company name, the podcast will be created with:

```json
{
  "title": "Verizon Intelligence Briefing",
  "subtitle": "Daily insights for Verizon",
  "description": "Stay ahead of the curve with AI-powered intelligence briefings tailored for Verizon. Get daily updates on industry trends, competitor moves, and market insights.",
  "author": "Verizon",
  "companyId": "Verizon",
  "industryId": "technology",
  "competitorIds": [],
  "cadence": "daily",
  "durationMinutes": 5,
  "publishTime": "09:00",
  "timezone": "America/New_York", // (or your local timezone)
  "timeWindowHours": 24,
  "topics": ["company-news", "competitor-analysis", "industry-trends"],
  "topicPriorities": {
    "company-news": 3,
    "competitor-analysis": 2,
    "industry-trends": 2
  },
  "regions": ["US"],
  "sourceLanguages": ["en"],
  "robotsMode": "strict",
  "allowDomains": [],
  "blockDomains": [],
  "voiceId": "alloy",
  "voiceSpeed": 1.0,
  "voiceTone": "professional"
}
```

---

## 🔍 Code Location

**File:** `src/app/podcasts/new/page.tsx`  
**Function:** `handleEasyModeSubmit()` (lines 82-148)

---

## 💡 Notes

1. **Competitors**: Empty by default - users can add them later via the podcast settings
2. **Timezone**: Automatically detected from browser - no manual selection needed
3. **Email**: Uses authenticated user's email if available, otherwise empty
4. **Industry**: Always defaults to "technology" - can be changed later
5. **All settings are customizable** after creation via the podcast settings page

---

## 🎯 What Gets Created

After clicking "I'm Feeling Lucky" with a company name:

1. ✅ Podcast record created in DynamoDB
2. ✅ Podcast configuration saved
3. ✅ User redirected to podcast detail page
4. ✅ Ready to run immediately (no additional setup needed)

The podcast is **fully functional** and can be run right away with these defaults!

