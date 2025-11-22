# Quick Fix Steps for OpenAI API Key and "Failed to Fetch" Error

## Problem
1. ❌ Creating a new run shows "Failed to Fetch" error
2. ❌ Generating competitor list fails (missing OpenAI API key)

## Root Cause
The ECS container doesn't have the `OPENAI_API_KEY` environment variable set, causing API routes to fail.

## Solution (3 Steps)

### Step 1: Create OpenAI API Key Secret

```powershell
aws secretsmanager create-secret `
  --name podcast-platform/openai-key `
  --secret-string '{"apiKey":"sk-proj-YOUR-ACTUAL-KEY-HERE"}' `
  --region us-east-1
```

**⚠️ Replace `sk-proj-YOUR-ACTUAL-KEY-HERE` with your actual OpenAI API key!**

### Step 2: Redeploy CDK Stack

```powershell
cd C:\Users\rohit.m.mangal\Cursor\company-intel-podcast\infra\cdk
cdk deploy --require-approval never
```

This will update the ECS task definition to read the secret from Secrets Manager.

### Step 3: Restart ECS Service

```powershell
aws ecs update-service `
  --cluster podcast-platform-cluster `
  --service PodcastPlatformStack-AppServiceA2F9036C-TpzovQqVYntg `
  --force-new-deployment `
  --region us-east-1
```

Wait 2-3 minutes for new containers to start with the updated configuration.

---

## Verify It Works

1. **Test Competitor Suggestions:**
   - Go to your podcast
   - Click "Generate Competitors"
   - Should work now ✅

2. **Test Creating a Run:**
   - Try creating a new run
   - Should no longer show "Failed to Fetch" ✅

3. **Check Logs (if still failing):**
   ```powershell
   aws logs tail /ecs/podcast-platform-app --region us-east-1 --follow
   ```

---

## What Changed

✅ CDK stack now reads `OPENAI_API_KEY` from AWS Secrets Manager  
✅ Secret is automatically injected as environment variable in the container  
✅ IAM permissions already configured (no changes needed)

---

## Notes

- The secret must exist **before** deploying the stack
- If you update the secret later, restart the ECS service to pick up changes
- The secret format is: `{"apiKey":"sk-proj-..."}`

