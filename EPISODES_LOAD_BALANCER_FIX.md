# Episodes Not Showing in Load Balancer - Fix Summary

## Problem
Episodes were showing in local development but not appearing in the load balancer/production environment.

## Root Cause
The issue was caused by three problems:

1. **File System Check in Production**: The `/api/podcasts/[id]/runs` GET handler was checking the local file system for completed runs with audio files. This worked locally but failed silently in production where files are stored in S3, not on the local file system.

2. **File Serving Route**: The `/api/serve-file/[...path]` route only read from the local file system, which doesn't work in production where files are in S3.

3. **Audio URL Construction**: The client-side code wasn't properly handling S3 keys and CloudFront URLs for production environments.

## Fixes Applied

### 1. Made File System Check Conditional (`src/app/api/podcasts/[id]/runs/route.ts`)
- Added environment check: Only runs file system check in non-production environments
- In production, all runs should come from DynamoDB with proper S3 keys
- Changed from silent error to conditional execution

```typescript
// Only check file system in local development
if (process.env.NODE_ENV !== 'production' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // File system check code...
}
```

### 2. Enhanced Serve-File Route (`src/app/api/serve-file/[...path]/route.ts`)
- Added S3 support: If local file not found, try S3
- CloudFront redirect: If CloudFront domain is configured, redirect to CloudFront URL
- S3 presigned URLs: If S3 bucket is configured but no CloudFront, generate presigned URL
- Fallback chain: Local file → CloudFront → S3 presigned URL → 404

### 3. Fixed Audio URL Construction (`src/app/podcasts/[id]/page.tsx`)
- Unified approach: Always use `/api/serve-file/` API which handles both local and S3
- The serve-file route now intelligently routes to local files or S3/CloudFront
- Removed client-side CloudFront logic (handled server-side now)

### 4. Added Debug Logging
- Added console logs to help debug episode fetching
- Logs show: total runs, completed runs, episodes with audio
- Helps identify if runs are missing audio keys

## How It Works Now

### Local Development
1. Runs are fetched from local file system (`data/runs.json`)
2. File system check adds any runs found in `output/episodes/` directory
3. Audio files served from local file system via `/api/serve-file/`

### Production (Load Balancer)
1. Runs are fetched from DynamoDB (via `getRunsForPodcast()`)
2. File system check is skipped (production environment)
3. Audio files with `audioS3Key` are served via:
   - CloudFront URL (if `CLOUDFRONT_DOMAIN` is set) - redirects to CloudFront
   - S3 presigned URL (if `S3_BUCKET_NAME` is set) - generates temporary URL
   - Falls back to 404 if neither is configured

## Required Environment Variables

For production to work correctly, ensure these are set:

```bash
# For S3 access
S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1

# For CloudFront (recommended)
CLOUDFRONT_DOMAIN=xxxxx.cloudfront.net

# Or for client-side access (optional)
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=xxxxx.cloudfront.net
```

## Testing

### Local Development
1. Episodes should appear if:
   - Runs are completed with `status: 'completed'`
   - Runs have `output.audioPath` or `output.audioS3Key`
   - Audio files exist in `output/episodes/run_xxx/audio.mp3`

### Production
1. Episodes should appear if:
   - Runs are in DynamoDB with `status: 'completed'`
   - Runs have `output.audioS3Key` set (e.g., `runs/run_xxx/audio.mp3`)
   - S3 bucket or CloudFront is configured
   - Audio files exist in S3 at the specified key

## Debugging

Check browser console for logs:
- `[EpisodesTab] Fetched X runs for podcast Y`
- `[EpisodesTab] X completed runs`
- `[EpisodesTab] X episodes with audio`

If episodes aren't showing:
1. Check if runs have `status: 'completed'`
2. Check if runs have `output.audioS3Key` or `output.audioPath`
3. Check if S3/CloudFront is configured
4. Check server logs for file serving errors

## Files Changed

1. `src/app/api/podcasts/[id]/runs/route.ts` - Made file system check conditional
2. `src/app/api/serve-file/[...path]/route.ts` - Added S3/CloudFront support
3. `src/app/podcasts/[id]/page.tsx` - Fixed audio URL construction, added logging

## Next Steps

If episodes still don't show in production:
1. Verify runs in DynamoDB have `output.audioS3Key` set
2. Verify S3 bucket contains audio files at the specified keys
3. Verify CloudFront distribution is configured correctly
4. Check IAM permissions for S3 access
5. Review server logs for specific errors

