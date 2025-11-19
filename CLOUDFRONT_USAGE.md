# CloudFront Usage After Amplify Deployment

## Current CloudFront Setup

Your CloudFront distribution (`https://dhycfwg0k4xij.cloudfront.net`) has **3 origins**:

1. **Frontend Bucket** (default) - `podcast-platform-frontend-098478926952`
   - Currently broken (AccessDenied error)
   - **Not needed anymore** once Amplify is deployed ✅

2. **Media Bucket** - `podcast-platform-media-098478926952`
   - Serves audio files at: `https://dhycfwg0k4xij.cloudfront.net/media/*`
   - **Still useful** for serving podcast audio files ✅

3. **RSS Bucket** - `podcast-platform-rss-098478926952`
   - Serves RSS feeds at: `https://dhycfwg0k4xij.cloudfront.net/rss/*`
   - **Still useful** for serving RSS feeds ✅

## After Amplify Deployment

### ✅ What You'll Use:

**Frontend (Amplify):**
- New URL: `https://main.xxxxxxxxxxxx.amplifyapp.com`
- Full Next.js support (SSR, API routes, ISR)
- Auto-deployments on Git push

**Media & RSS (CloudFront):**
- Keep using: `https://dhycfwg0k4xij.cloudfront.net/media/*`
- Keep using: `https://dhycfwg0k4xij.cloudfront.net/rss/*`
- These still work fine!

### ❌ What You Won't Need:

- **Frontend CloudFront URL**: `https://dhycfwg0k4xij.cloudfront.net` (root)
  - This was for serving the frontend website
  - Not needed once Amplify is live
  - Currently broken anyway (AccessDenied)

## Options

### Option 1: Keep CloudFront for Media/RSS (Recommended)
- ✅ CloudFront continues serving media and RSS files
- ✅ No changes needed to CDK stack
- ✅ Frontend default origin can be ignored (it's broken anyway)
- ✅ Media and RSS paths still work: `/media/*` and `/rss/*`

### Option 2: Remove Frontend Origin from CloudFront
- Update CDK stack to remove frontend bucket origin
- Keep only media and RSS origins
- Redeploy: `npm run deploy`
- This cleans up the broken frontend origin

### Option 3: Use Amplify for Everything
- Move media files to Amplify (not recommended - Amplify is for web apps)
- Move RSS to Amplify (possible but CloudFront is better for static files)
- **Not recommended** - CloudFront is better for media/RSS

## Recommendation

**Keep CloudFront as-is** for media and RSS:
- ✅ Media files: `https://dhycfwg0k4xij.cloudfront.net/media/audio.mp3`
- ✅ RSS feeds: `https://dhycfwg0k4xij.cloudfront.net/rss/podcast.xml`
- ✅ Frontend: Use Amplify URL instead

The broken frontend origin doesn't matter - you just won't use the root CloudFront URL for the frontend anymore.

## Summary

| Service | URL | Status | Needed? |
|---------|-----|--------|---------|
| **Frontend** | `https://main.xxxxxxxxxxxx.amplifyapp.com` | ✅ Amplify | ✅ Yes |
| **Media** | `https://dhycfwg0k4xij.cloudfront.net/media/*` | ✅ CloudFront | ✅ Yes |
| **RSS** | `https://dhycfwg0k4xij.cloudfront.net/rss/*` | ✅ CloudFront | ✅ Yes |
| **Frontend (old)** | `https://dhycfwg0k4xij.cloudfront.net` | ❌ Broken | ❌ No |

---

**TL;DR**: The CloudFront root URL for frontend is not needed. Keep CloudFront for media/RSS files. Use Amplify for the frontend website.

