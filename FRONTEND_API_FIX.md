# Frontend API Fix - topicIds Validation Error

## Issue
When creating a podcast, the frontend was sending `topics` but the backend expects `topicIds`. This caused a validation error:
```json
{"error":"Validation error","details":[{"code":"invalid_type","expected":"array","received":"undefined","path":["topicIds"],"message":"Required"}]}
```

## Fix Applied

### 1. Fixed Field Name Mismatch
- **Before**: Frontend sent `topics: [...]`
- **After**: Frontend sends `topicIds: [...]` (as required by backend schema)

### 2. Added All Required Fields
The backend `CreatePodcastRequestSchema` requires these fields:
- ✅ Step 1: Branding & Metadata (title, subtitle, description, author, email, category, explicit, language)
- ✅ Step 2: Company & Industry (companyId, industryId, competitorIds)
- ✅ Step 3: Preset & Cadence (cadence, durationMinutes, publishTime, timezone, timeWindowHours)
- ✅ Step 4: Topics & Regions (topicIds, topicPriorities, regions, sourceLanguages, robotsMode, allowDomains, blockDomains)
- ✅ Step 5: Voice & Review (voiceId, voiceSpeed, voiceTone)

### 3. Added Fallback Defaults
- If `topicIds` is empty, defaults to: `['company-news', 'competitor-analysis', 'industry-trends']`
- All other fields have sensible defaults

## Files Changed
- `src/app/podcasts/new/page.tsx`
  - `handleSubmit()`: Changed `topics` to `topicIds` and added all required fields
  - `handleEasyModeSubmit()`: Changed `topics` to `topicIds` and ensured all fields are present

## Testing
After this fix:
1. ✅ Creating a podcast should work without validation errors
2. ✅ All required fields are sent to the backend
3. ✅ Default values are provided for optional fields

## Next Steps
1. Deploy the updated frontend to Amplify
2. Test creating a new podcast
3. Verify podcasts appear in the list after creation

