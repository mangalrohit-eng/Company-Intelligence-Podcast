# How to Check if Amplify Credentials Are Working

## Quick Check: Debug Endpoint

After Amplify rebuilds, check the debug endpoint to see if credentials are detected:

**URL:** `https://main.d9ifmpfg9093g.amplifyapp.com/api/debug/aws`

This will show:
- `hasAmplifyAccessKey`: Whether `AMPLIFY_ACCESS_KEY_ID` is detected
- `hasAmplifySecretKey`: Whether `AMPLIFY_SECRET_ACCESS_KEY` is detected
- `amplifyAccessKeyPrefix`: First 7 characters of access key (if set)
- `s3BucketMedia`: S3 bucket name (if set)

## Check Error Response

When accessing a file that fails, the error response includes `envDebug`:

**Example:** Try accessing: `https://main.d9ifmpfg9093g.amplifyapp.com/api/serve-file/runs/c520806f-cba6-45c3-9b0f-c6d87aafdad6/debug/discover_output.json`

The error response will show:
```json
{
  "error": "File not found",
  "envDebug": {
    "hasAmplifyCreds": true/false,
    "amplifyAccessKeyId": "AKIA..." or "NOT SET",
    "relevantEnvVars": {
      "AMPLIFY_ACCESS_KEY_ID": "SET" or "NOT SET",
      "AMPLIFY_SECRET_ACCESS_KEY": "SET" or "NOT SET",
      ...
    }
  }
}
```

## Check CloudWatch Logs

1. **Go to CloudWatch Console**
   - https://console.aws.amazon.com/cloudwatch
   - Click **"Log groups"** in left sidebar

2. **Find Amplify Log Group**
   - Search for: `/aws/amplify/d9ifmpfg9093g`
   - Click on the log group

3. **Check Recent Logs**
   - Look for log streams with recent timestamps
   - Search for: `AMPLIFY_ACCESS_KEY_ID` or `credentials`
   - Look for messages like:
     - `"Using custom Amplify credentials (AMPLIFY_ACCESS_KEY_ID)"` ✅ Good
     - `"Using default credential provider"` ❌ Credentials not detected

## Common Issues

### Issue 1: Variables Not Set
**Symptom:** `hasAmplifyAccessKey: false` in debug endpoint

**Solution:**
- Go to Amplify Console → Environment variables
- Verify `AMPLIFY_ACCESS_KEY_ID` and `AMPLIFY_SECRET_ACCESS_KEY` are set
- Check for typos (must be exact: `AMPLIFY_ACCESS_KEY_ID`)

### Issue 2: Rebuild Not Completed
**Symptom:** Variables are set but not detected

**Solution:**
- Check Amplify Console → Deployments
- Wait for latest build to complete
- Variables are only available after rebuild

### Issue 3: Wrong Variable Names
**Symptom:** Variables set but `hasAmplifyAccessKey: false`

**Solution:**
- Must use `AMPLIFY_ACCESS_KEY_ID` (not `AWS_ACCESS_KEY_ID`)
- Must use `AMPLIFY_SECRET_ACCESS_KEY` (not `AWS_SECRET_ACCESS_KEY`)
- Check for extra spaces or quotes in values

## Next Steps

1. **Check debug endpoint** to see if credentials are detected
2. **Check error response** for detailed `envDebug` info
3. **Check CloudWatch logs** for credential detection messages
4. **Share the results** so we can diagnose further

