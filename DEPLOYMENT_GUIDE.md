# 🚀 AWS Deployment Guide

Complete guide to deploy your AI Podcast Platform to AWS for internet access.

## Prerequisites

- ✅ AWS Account
- ✅ AWS CLI installed and configured
- ✅ AWS CDK CLI installed (`npm install -g aws-cdk`)
- ✅ Node.js 18+ installed
- ✅ Your `.env` file with `OPENAI_API_KEY` and AWS credentials

## Quick Start

### Option 1: Deploy Everything (Recommended)

```powershell
# Deploy backend infrastructure + frontend
npm run deploy:all
```

This will:
1. Deploy all AWS infrastructure (DynamoDB, Lambda, API Gateway, etc.)
2. Build your Next.js app
3. Deploy frontend to S3/CloudFront
4. Invalidate CloudFront cache

### Option 2: Deploy Step by Step

#### Step 1: Deploy Backend Infrastructure

```powershell
# Deploy CDK stack (creates all AWS resources)
npm run deploy
```

**Expected Output:**
```
✅ PodcastPlatformStack

Outputs:
PodcastPlatformStack.ApiUrl = https://xxxxx.execute-api.us-east-1.amazonaws.com
PodcastPlatformStack.UserPoolId = us-east-1_xxxxx
PodcastPlatformStack.UserPoolClientId = xxxxx
PodcastPlatformStack.FrontendBucketName = podcast-platform-frontend-098478926952
PodcastPlatformStack.DistributionDomain = https://xxxxx.cloudfront.net
```

**⚠️ Save these values!** You'll need them for the frontend.

#### Step 2: Deploy Frontend

```powershell
# Build and deploy Next.js app
npm run deploy:frontend
```

This script will:
- Build your Next.js app with production settings
- Get deployment info from CloudFormation stack
- Sync files to S3
- Invalidate CloudFront cache

## Manual Deployment

If the automated script doesn't work, you can deploy manually:

### 1. Set Environment Variables

```powershell
# Get values from CloudFormation stack outputs
$ApiUrl = "https://xxxxx.execute-api.us-east-1.amazonaws.com"
$UserPoolId = "us-east-1_xxxxx"
$ClientId = "xxxxx"
$Bucket = "podcast-platform-frontend-098478926952"
$DistributionId = "xxxxx"  # From CloudFront console

# Set environment variables
$env:NEXT_PUBLIC_API_URL = $ApiUrl
$env:NEXT_PUBLIC_COGNITO_USER_POOL_ID = $UserPoolId
$env:NEXT_PUBLIC_COGNITO_CLIENT_ID = $ClientId
$env:NODE_ENV = "production"
```

### 2. Build Next.js

```powershell
npm run build
```

### 3. Sync to S3

```powershell
# For standalone output
aws s3 sync .next/standalone s3://$Bucket/ --delete

# Or for static export
aws s3 sync out s3://$Bucket/ --delete
```

### 4. Invalidate CloudFront

```powershell
aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
```

## Configuration

### Update Environment Variables

After deployment, update your frontend to use the deployed API:

1. **Get API URL from CloudFormation:**
   ```powershell
   aws cloudformation describe-stacks --stack-name PodcastPlatformStack --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text
   ```

2. **Update `.env` or set build-time variables:**
   ```bash
   NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
   NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx
   ```

### Update Next.js Config

The `next.config.mjs` is already configured for standalone output. If you need to change the API URL at build time:

```javascript
env: {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://your-api.execute-api.us-east-1.amazonaws.com',
  // ...
}
```

## Access Your App

After deployment, your app will be available at:

```
https://xxxxx.cloudfront.net
```

The CloudFront URL is shown in:
- CloudFormation stack outputs
- CloudFront console
- Deployment script output

## Troubleshooting

### Build Fails

```powershell
# Clear Next.js cache
Remove-Item -Recurse -Force .next
npm run build
```

### S3 Sync Fails

```powershell
# Check AWS credentials
aws sts get-caller-identity

# Check bucket exists
aws s3 ls s3://podcast-platform-frontend-098478926952
```

### CloudFront Not Updating

```powershell
# Force invalidation
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations --distribution-id YOUR_DIST_ID
```

### API Routes Not Working

Next.js API routes need to run on a server. Options:

1. **Use AWS Amplify** (easiest - handles Next.js automatically)
2. **Deploy API routes as Lambda functions** (update CDK stack)
3. **Use ECS/Fargate** (containerized deployment)

For now, the frontend will call the API Gateway endpoints directly.

## Cost Estimation

| Service | Monthly Cost |
|---------|--------------|
| S3 Storage | ~$1-5 |
| CloudFront | ~$1-10 |
| API Gateway | ~$3.50 per million requests |
| Lambda | ~$0.20 per million requests |
| DynamoDB | ~$5-25 (pay per request) |
| **Total** | **~$10-50/month** + usage |

## Next Steps

1. ✅ Test your deployed app
2. ✅ Set up custom domain (optional)
3. ✅ Configure CloudFront caching
4. ✅ Set up monitoring/alerts
5. ✅ Configure backup/retention policies

## Support

If you encounter issues:

1. Check AWS CloudWatch Logs
2. Check CloudFormation stack events
3. Verify IAM permissions
4. Check S3 bucket policies
5. Review CloudFront distribution settings

