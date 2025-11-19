# 🚀 Quick AWS Deployment

## One-Command Deployment

```powershell
npm run deploy:all
```

This deploys everything: backend infrastructure + frontend.

## Step-by-Step

### 1. Deploy Backend (First Time Only)

```powershell
npm run deploy
```

Wait for completion (~10-15 minutes). Save the output values.

### 2. Deploy Frontend

```powershell
npm run deploy:frontend
```

This will:
- Build your Next.js app
- Get deployment info from CloudFormation
- Upload to S3
- Invalidate CloudFront cache

### 3. Access Your App

After deployment, visit the CloudFront URL shown in the output:
```
https://xxxxx.cloudfront.net
```

## Important Notes

⚠️ **Next.js API Routes**: The current deployment uses S3/CloudFront for static hosting. Your Next.js API routes (`/api/*`) won't work directly. 

**Solutions:**
1. **Use API Gateway endpoints** (already deployed) - Update frontend to call API Gateway URLs
2. **Deploy as container** - Use ECS/Fargate (requires CDK updates)
3. **Use AWS Amplify** - Handles Next.js automatically (recommended for full Next.js support)

For now, the frontend will work, but API routes need to be updated to call the API Gateway endpoints instead of `/api/*`.

## Environment Variables

Before deploying, ensure your `.env` has:
```bash
OPENAI_API_KEY=sk-proj-...
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=098478926952
```

The deployment script will automatically use CloudFormation outputs for:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`

## Troubleshooting

**Build fails?**
```powershell
Remove-Item -Recurse -Force .next
npm install
npm run build
```

**S3 sync fails?**
```powershell
aws sts get-caller-identity  # Verify credentials
aws s3 ls  # Verify access
```

**CloudFront not updating?**
Wait 1-2 minutes for cache invalidation, or manually invalidate:
```powershell
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

