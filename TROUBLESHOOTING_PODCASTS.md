# Troubleshooting: Podcasts Not Showing

## Current Status
- ✅ Lambda function deployed with fix
- ✅ Scan for legacy podcasts enabled
- ⚠️ Podcasts still not visible

## Debugging Steps

### 1. Check Browser Console
Open DevTools (F12) → Console tab and look for:
- `📡 Podcasts API Response` - Check status code
- `📦 Podcasts Data` - Check what data is returned
- Any error messages

### 2. Check Network Tab
Open DevTools → Network tab:
- Find the request to `/podcasts`
- Check the Response tab - what does it return?
- Check the Headers tab - is Authorization header present?

### 3. Check CloudWatch Logs
```powershell
aws logs tail /aws/lambda/podcast-list --since 10m --region us-east-1 --format short
```

Look for:
- "No podcasts found with orgId, checking for legacy podcasts"
- "Found legacy podcasts without orgId"
- "Listed podcasts" with count

### 4. Test API Directly
You can test the API directly (requires auth token):
```powershell
# Get your auth token from browser (DevTools → Application → Local Storage)
$token = "your-jwt-token-here"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com/podcasts" -Method GET -Headers $headers
```

### 5. Verify DynamoDB
```powershell
# Check how many podcasts exist without orgId
aws dynamodb scan --table-name podcasts --filter-expression "attribute_not_exists(orgId)" --region us-east-1 --select COUNT
```

## Common Issues

### Issue 1: Empty Response
**Symptom**: API returns `{ podcasts: [] }`
**Cause**: No podcasts match the query/scan
**Solution**: Create a new podcast to test

### Issue 2: Authentication Error
**Symptom**: 401 or 403 error
**Cause**: Token missing or expired
**Solution**: Re-login to get a fresh token

### Issue 3: CORS Error
**Symptom**: CORS error in browser console
**Cause**: API Gateway CORS not configured for Amplify domain
**Solution**: Check API Gateway CORS settings

### Issue 4: Response Format Mismatch
**Symptom**: Data returned but frontend doesn't parse it
**Cause**: Response structure doesn't match frontend expectations
**Solution**: Check browser console for the actual response structure

## Expected Response Format
```json
{
  "podcasts": [
    {
      "id": "podcast_xxx",
      "title": "Podcast Title",
      "subtitle": "Subtitle",
      "status": "active",
      "config": {
        "schedule": "daily"
      },
      ...
    }
  ],
  "nextToken": null
}
```

## Next Steps
1. Check browser console for errors
2. Check Network tab for API response
3. Verify the response has `podcasts` array
4. Check if podcasts array is empty or has items
5. Share the console/network output for further debugging

