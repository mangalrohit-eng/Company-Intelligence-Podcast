# Fix OpenAI API Key and "Failed to Fetch" Issues

## Issue 1: OpenAI API Key Missing

The application needs an OpenAI API key to:
- Generate competitor suggestions
- Run the podcast pipeline with OpenAI providers
- Generate voice previews

## Issue 2: "Failed to Fetch" When Creating Runs

This could be due to:
- Missing OpenAI API key causing the API route to fail
- CORS issues
- API route errors

---

## Solution: Configure OpenAI API Key

### Step 1: Create Secret in AWS Secrets Manager

```powershell
aws secretsmanager create-secret `
  --name podcast-platform/openai-key `
  --secret-string '{"apiKey":"sk-proj-YOUR-ACTUAL-KEY-HERE"}' `
  --region us-east-1
```

**Replace `sk-proj-YOUR-ACTUAL-KEY-HERE` with your actual OpenAI API key.**

### Step 2: Update CDK Stack to Use Secret

✅ **DONE** - The CDK stack has been updated to read from Secrets Manager. The secret will be automatically injected as `OPENAI_API_KEY` environment variable in the container.

### Step 3: Redeploy CDK Stack

```powershell
cd C:\Users\rohit.m.mangal\Cursor\company-intel-podcast\infra\cdk
cdk deploy --require-approval never
```

### Step 4: Restart ECS Service (to pick up new environment variables)

```powershell
aws ecs update-service `
  --cluster podcast-platform-cluster `
  --service PodcastPlatformStack-AppServiceA2F9036C-TpzovQqVYntg `
  --force-new-deployment `
  --region us-east-1
```

Wait 2-3 minutes for the new tasks to start.

---

## Verify Fix

1. **Check competitor suggestions work:**
   - Go to your podcast
   - Try generating competitor suggestions
   - Should work now

2. **Check creating runs works:**
   - Try creating a new run
   - Should no longer show "Failed to Fetch"

3. **Check logs if still failing:**
   ```powershell
   aws logs tail /ecs/podcast-platform-app --region us-east-1 --follow
   ```

---

## Alternative: Quick Test with Environment Variable (Not Recommended for Production)

If you want to test quickly without Secrets Manager, you can temporarily add the key directly to the CDK stack (NOT recommended for production):

Update `infra/cdk/lib/podcast-platform-stack.ts` line ~487:
```typescript
environment: {
  // ... existing vars
  OPENAI_API_KEY: 'sk-proj-your-key-here', // TEMPORARY - Use Secrets Manager in production
},
```

Then redeploy. **But use Secrets Manager for production!**

