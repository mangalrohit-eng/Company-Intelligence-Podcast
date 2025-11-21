# How to Check Amplify Build Logs for .env.production

## Where to Find the Logs

1. **Go to Amplify Console**
   - https://console.aws.amazon.com/amplify
   - Click on your app: **Company-Intelligence-Podcast**

2. **Open Latest Deployment**
   - Click **"Deployments"** tab
   - Click on the **latest deployment** (should show "Succeeded" or "In progress")

3. **View Build Logs**
   - Click **"View logs"** or expand the build details
   - Look for the **"Frontend"** section (not "Backend")

## What to Look For

In the **Frontend build logs**, you should see:

### PreBuild Phase
Look for these lines:
```
## Starting Frontend Build
## Starting preBuild phase
Creating .env.production file for runtime access...
.env.production created:
AMPLIFY_ACCESS_KEY_ID=***HIDDEN***
AMPLIFY_SECRET_ACCESS_KEY=***HIDDEN***
S3_BUCKET_MEDIA=podcast-platform-media-098478926952
REGION=us-east-1
ACCOUNT_ID=098478926952
File has 5 lines
```

### If You See Errors
If you see:
- `AMPLIFY_ACCESS_KEY_ID not set` - The variable isn't available during build
- `File has 0 lines` - No variables were written
- No `.env.production` messages at all - The preBuild script didn't run

## Common Issues

### Issue 1: Variables Not Available During Build
**Symptom:** Logs show `AMPLIFY_ACCESS_KEY_ID not set`

**Solution:**
- Verify variables are set at **App level** (not just branch level)
- Check variable names for typos
- Ensure variables are saved in Amplify Console

### Issue 2: PreBuild Script Not Running
**Symptom:** No `.env.production` messages in logs

**Solution:**
- Check that `amplify.yml` is in the root of your repository
- Verify the file was committed and pushed
- Check that Amplify is using the correct branch

### Issue 3: File Created But Not Loaded
**Symptom:** Logs show file created, but variables still not detected

**Solution:**
- Check that `import 'dotenv/config'` is in your API route files
- Verify `.env.production` is in the root directory (not in `.next/`)
- Check Next.js build logs for any dotenv errors

## Next Steps

1. **Find the Frontend build logs** (not Backend)
2. **Look for the preBuild phase** where `.env.production` is created
3. **Share the relevant log lines** so we can diagnose the issue

