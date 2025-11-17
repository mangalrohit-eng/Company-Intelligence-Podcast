# RSS Feed Management - Implementation Summary

## Overview
Implemented a complete RSS feed management system in the Admin Settings page, allowing you to add, edit, disable, and delete news sources for podcast discovery.

## Changes Made

### 1. **Default Configuration** ✅
- **Reuters**: Disabled (feed discontinued in 2020)
- **Financial Times**: Disabled (no keyword filtering support)
- **Google News**: Enabled (recommended - supports company search)

### 2. **Admin UI Features** 🎨

#### RSS Feed Manager Component (`src/app/admin/settings/RssFeedManager.tsx`)
- **Add New Feeds**: Form to add custom RSS feeds
- **Edit Feeds**: Modify existing feed details
- **Enable/Disable**: Toggle feeds without deleting them
- **Delete Feeds**: Remove feeds permanently
- **Company Placeholder**: Use `{company}` in URLs - automatically replaced with podcast company name

#### UI Features:
- ✅ Visual status indicators (Enabled/Disabled badges)
- ✅ Active feed counter
- ✅ Warning if no feeds are enabled
- ✅ Inline editing forms
- ✅ URL preview with syntax highlighting
- ✅ Helpful tips and best practices

### 3. **Backend Integration** 🔧

#### Data Flow:
1. **Admin Settings API** (`src/app/api/admin/settings/route.ts`):
   - GET: Returns current RSS feed configuration
   - PUT: Saves updated RSS feed list

2. **Pipeline Orchestrator** (`src/engine/orchestrator.ts`):
   - Reads RSS feeds from admin settings
   - Filters for enabled feeds only
   - Replaces `{company}` placeholder with actual company name
   - Passes URLs to Discover stage

3. **Discover Stage** (`src/engine/stages/discover.ts`):
   - Fetches articles from configured RSS feeds
   - Filters articles to ensure company name is mentioned
   - Prevents irrelevant articles from general feeds

### 4. **Type System** 📝
- `RSSFeed` interface with `id`, `name`, `url`, `enabled`, `description`
- `DiscoverySettings` containing array of RSS feeds
- `RssFeed` type alias for backward compatibility

## How to Use

### Access the Admin Settings Page:
1. Navigate to: `http://localhost:3000/admin/settings`
2. Scroll to the **RSS Feed Discovery** section

### Add a New Feed:
1. Click "Add Feed"
2. Enter:
   - **Name**: e.g., "TechCrunch"
   - **URL**: e.g., `https://techcrunch.com/feed/?q={company}`
   - **Description**: Optional notes
   - **Enabled**: Check to activate immediately
3. Click "Add Feed"

### Manage Existing Feeds:
- **Disable**: Click "Disable" to keep the feed but not use it
- **Enable**: Click "Enable" to activate a disabled feed
- **Edit**: Click "✏️ Edit" to modify feed details
- **Delete**: Click trash icon to remove permanently

### Best Practices:
- Always use `{company}` placeholder in URLs for company-specific searches
- Keep at least one feed enabled for discovery to work
- Google News is recommended as it aggregates from many sources
- Disable feeds that produce irrelevant articles

## Example RSS Feed URLs

### Company-Specific Feeds:
```
Google News:
https://news.google.com/rss/search?q={company}

Bing News:
https://www.bing.com/news/search?q={company}&format=rss
```

### General Business Feeds (Use with caution):
```
Reuters Business:
https://www.reuters.com/rssfeed/businessNews
(⚠️ No company filtering - produces many irrelevant articles)

Financial Times:
https://www.ft.com/?format=rss
(⚠️ No company filtering - produces many irrelevant articles)
```

## Current Status

### Default Feeds:
| Feed | Status | URL Pattern | Notes |
|------|--------|-------------|-------|
| Google News | ✅ Enabled | `news.google.com/rss/search?q={company}` | Recommended |
| Reuters | ❌ Disabled | `reuters.com/rssfeed/companyNews` | Discontinued |
| FT | ❌ Disabled | `ft.com/?format=rss` | No filtering |

### Recent Improvements:
- ✅ Reuters and FT disabled by default
- ✅ Discover stage filters articles by company name
- ✅ Admin UI for complete feed management
- ✅ Real-time feed enable/disable toggle
- ✅ Validation to prevent saving with no enabled feeds

## Testing

To test the RSS feed configuration:
1. Go to Admin Settings
2. Enable/disable feeds as desired
3. Click "Save Changes"
4. Create a podcast for a specific company
5. Start a new run
6. Check the Discover stage output to see which articles were found

The Discover stage debug JSON will show:
- Total articles found
- Which feed they came from
- Whether they passed company name filter

## Files Modified

```
src/types/admin-settings.ts              - Type definitions
src/app/admin/settings/page.tsx          - Admin page integration
src/app/admin/settings/RssFeedManager.tsx - RSS feed UI component
src/app/api/admin/settings/route.ts      - API endpoint for saving
src/engine/orchestrator.ts               - Reads feeds from settings
src/engine/stages/discover.ts            - Uses feeds, filters by company
```

## Git Commits

```
106d0f4 - feat: Add RSS feed management backend (Reuters/FT disabled)
ee069d9 - feat: Add RSS Feed Management UI in Admin Settings
759abed - fix: Add RssFeed type alias for consistent imports
```

---

## Next Steps (Optional Enhancements)

1. **Feed Validation**: Test RSS feed URLs before saving
2. **Feed Stats**: Track how many articles each feed produces
3. **Feed Groups**: Organize feeds by category (Tech, Finance, General)
4. **Import/Export**: Backup and restore feed configurations
5. **Feed Templates**: Pre-configured feeds for common news sources

