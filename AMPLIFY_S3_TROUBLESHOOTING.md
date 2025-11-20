# Amplify S3 Access Troubleshooting

## The Problem

All these issues are related to S3 access not working in Amplify:
- ❌ Can't read debug JSONs from S3
- ❌ Audio files showing 0 seconds duration
- ❌ "Could not load credentials from any providers" error

## Root Cause

Amplify's Next.js API routes (`/api/serve-file/...`) cannot access S3 because:
1. They don't automatically use IAM roles
2. They need explicit AWS credentials via environment variables
3. Amplify doesn't allow env vars starting with "AWS" prefix

## Solution Checklist

### ✅ Step 1: Create IAM User with S3 Permissions
- [ ] IAM Console → Users → Create user: `amplify-api-s3-access`
- [ ] Attach policy: `AmazonS3ReadOnlyAccess`
- [ ] Create access keys
- [ ] **Copy both keys immediately** (secret is shown only once!)

### ✅ Step 2: Add Environment Variables to Amplify
- [ ] Amplify Console → Your App → **Environment variables**
- [ ] Add: `AMPLIFY_ACCESS_KEY_ID` = (your access key ID)
- [ ] Add: `AMPLIFY_SECRET_ACCESS_KEY` = (your secret access key)
- [ ] **Important:** Use `AMPLIFY_` prefix, NOT `AWS_` (Amplify blocks AWS prefix)

### ✅ Step 3: Verify Variables Are Set
- [ ] Check Amplify Console → Environment variables
- [ ] Verify both variables are listed
- [ ] Check that values don't have extra spaces/quotes

### ✅ Step 4: Wait for Rebuild
- [ ] Amplify automatically rebuilds after saving env vars
- [ ] Go to **Deployments** tab
- [ ] Wait for latest build to complete (~5-10 minutes)
- [ ] Check build logs for any errors

### ✅ Step 5: Test S3 Access
- [ ] Try accessing a debug JSON: `/api/serve-file/runs/{runId}/debug/prepare_output.json`
- [ ] Check browser console for error details
- [ ] Check Amplify build logs or CloudWatch logs for credential detection messages

## Debugging

### Check Error Response
When accessing a file, the error response includes `envDebug` object showing:
- `hasAmplifyCreds`: Whether `AMPLIFY_ACCESS_KEY_ID` is detected
- `amplifyAccessKeyId`: First 7 characters of access key (if set)
- `relevantEnvVars`: All environment variables related to S3/AWS

### Check Amplify Build Logs
1. Amplify Console → Your App → **Deployments**
2. Click on latest deployment
3. Check **Build logs** for:
   - `Using custom Amplify credentials (AMPLIFY_ACCESS_KEY_ID)` - ✅ Good
   - `Using default credential provider` - ❌ Credentials not detected

### Check CloudWatch Logs
1. CloudWatch Console → Log groups
2. Search for: `/aws/amplify/Company-Intelligence-Podcast`
3. Look for credential-related log messages

## Common Issues

### Issue 1: Variables Not Available at Runtime
**Symptom:** Variables are set in Amplify Console but not detected in API routes

**Solution:** 
- Verify variables are set at **App level** (not branch level)
- Check that Amplify rebuild completed successfully
- Variables should be available to API routes automatically (no extra config needed)

### Issue 2: Wrong Variable Names
**Symptom:** `hasAmplifyCreds: false` in error response

**Solution:**
- Must use `AMPLIFY_ACCESS_KEY_ID` (not `AWS_ACCESS_KEY_ID`)
- Must use `AMPLIFY_SECRET_ACCESS_KEY` (not `AWS_SECRET_ACCESS_KEY`)
- Check for typos in variable names

### Issue 3: Credentials Invalid
**Symptom:** "Could not load credentials" even when variables are detected

**Solution:**
- Verify IAM user has `AmazonS3ReadOnlyAccess` policy
- Check that access keys are correct (no extra spaces)
- Create new access keys if needed

### Issue 4: Build Not Completed
**Symptom:** Changes not taking effect

**Solution:**
- Wait for Amplify rebuild to complete
- Check Deployments tab for build status
- Redeploy manually if needed: **Redeploy this version**

## Verification

After following all steps, you should see:
1. ✅ Debug JSONs accessible: `/api/serve-file/runs/{runId}/debug/prepare_output.json`
2. ✅ Audio files playable with correct duration
3. ✅ No "Could not load credentials" errors

## Next Steps

If still not working after all steps:
1. Check the `envDebug` object in error response
2. Share the error response details
3. Check CloudWatch logs for credential detection messages
4. Verify IAM user permissions in IAM Console

