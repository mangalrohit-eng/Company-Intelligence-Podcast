# Fix Secrets Manager Secret Format

## The Problem

The ECS deployment is **stuck** because the secret in Secrets Manager has an **invalid JSON format**.

**Error:**
```
unable to retrieve secret from asm: invalid character 'a' looking for beginning of object key string
```

## Root Cause

The secret value is not valid JSON. ECS expects:
```json
{"apiKey":"sk-proj-..."}
```

But it might be stored as:
- Just the key: `sk-proj-...` ❌
- Wrong format: `apiKey=sk-proj-...` ❌
- Invalid JSON: `{apiKey:"sk-proj-..."}` ❌ (missing quotes)

## Solution

### Step 1: Check Current Secret Format

```powershell
aws secretsmanager get-secret-value `
  --secret-id podcast-platform/openai-key `
  --region us-east-1 `
  --query 'SecretString' `
  --output text
```

### Step 2: Update Secret with Correct Format

The secret **MUST** be valid JSON:

```powershell
aws secretsmanager update-secret `
  --secret-id podcast-platform/openai-key `
  --secret-string '{"apiKey":"sk-proj-YOUR-ACTUAL-KEY-HERE"}' `
  --region us-east-1
```

**Important:**
- Use single quotes around the JSON string
- Use double quotes inside the JSON
- Format: `{"apiKey":"value"}`

### Step 3: Restart ECS Service

After updating the secret:

```powershell
aws ecs update-service `
  --cluster podcast-platform-cluster `
  --service PodcastPlatformStack-AppServiceA2F9036C-TpzovQqVYntg `
  --force-new-deployment `
  --region us-east-1
```

### Step 4: Monitor Deployment

```powershell
aws ecs describe-services `
  --cluster podcast-platform-cluster `
  --services PodcastPlatformStack-AppServiceA2F9036C-TpzovQqVYntg `
  --region us-east-1 `
  --query 'services[0].events[0:3]'
```

## Verify Secret Format

After updating, verify it's correct:

```powershell
aws secretsmanager get-secret-value `
  --secret-id podcast-platform/openai-key `
  --region us-east-1 `
  --query 'SecretString' `
  --output text | ConvertFrom-Json
```

Should output:
```
apiKey
-----
sk-proj-...
```

## Why This Happened

When you created the secret, you might have:
1. Used the wrong format
2. Forgot the JSON wrapper
3. Used invalid JSON syntax

The CDK expects the secret to be JSON with an `apiKey` field, which ECS then extracts and injects as `OPENAI_API_KEY` environment variable.

