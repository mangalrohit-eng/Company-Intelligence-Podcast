# Testing Secret Injection

## Issue
The `OPENAI_API_KEY` secret is configured in the task definition but not being injected into the running container.

## Steps to Verify

### 1. Check Task Definition
```powershell
aws ecs describe-task-definition `
  --task-definition PodcastPlatformStackAppTaskDefF74E4751:2 `
  --region us-east-1 `
  --query 'taskDefinition.containerDefinitions[0].secrets'
```

Should show:
```json
[
  {
    "name": "OPENAI_API_KEY",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:098478926952:secret:podcast-platform/openai-key:apiKey::"
  }
]
```

### 2. Check Execution Role Permissions
The execution role needs:
- `secretsmanager:DescribeSecret`
- `secretsmanager:GetSecretValue`

On resource: `arn:aws:secretsmanager:us-east-1:098478926952:secret:podcast-platform/openai-key-*`

### 3. Test Secret Access
```powershell
# Get the execution role ARN
$execRole = aws ecs describe-task-definition `
  --task-definition PodcastPlatformStackAppTaskDefF74E4751:2 `
  --region us-east-1 `
  --query 'taskDefinition.executionRoleArn' `
  --output text

# Test if role can read secret (requires assuming the role)
```

### 4. Check Container Logs
```powershell
aws logs tail /ecs/podcast-platform-app --region us-east-1 --follow
```

Look for:
- `OPENAI_API_KEY not set`
- `❌ OPENAI_API_KEY not set`
- Any errors about secret retrieval

### 5. Verify Secret Format
```powershell
aws secretsmanager get-secret-value `
  --secret-id podcast-platform/openai-key `
  --region us-east-1 `
  --query 'SecretString' `
  --output text | ConvertFrom-Json
```

Should return valid JSON with `apiKey` field.

## Common Issues

### Issue 1: Secret ARN Mismatch
**Symptom:** Container shows `secrets: null`

**Fix:** Ensure the secret ARN in task definition matches the actual secret ARN (including the random suffix).

### Issue 2: Execution Role Permissions
**Symptom:** Task fails to start with "unable to retrieve secret"

**Fix:** Ensure execution role has `secretsmanager:GetSecretValue` permission on the secret.

### Issue 3: Secret Format
**Symptom:** "invalid character" errors

**Fix:** Ensure secret is valid JSON: `{"apiKey":"sk-proj-..."}`

### Issue 4: Container Started Before Secret Fix
**Symptom:** Old container still running without secret

**Fix:** Force new deployment:
```powershell
aws ecs update-service `
  --cluster podcast-platform-cluster `
  --service PodcastPlatformStack-AppServiceA2F9036C-TpzovQqVYntg `
  --force-new-deployment `
  --region us-east-1
```

## Next Steps

After restarting the service, wait 2-3 minutes and check:
1. New task is running
2. Container logs show no OPENAI_API_KEY errors
3. Test competitor suggestions endpoint

