# AWS Amplify Deployment Guide

Your Next.js frontend is now ready to deploy to AWS Amplify! This guide will walk you through the deployment process.

## ✅ Pre-Deployment Checklist

- [x] AWS Amplify CLI installed
- [x] `amplify.yml` build configuration created
- [x] Backend configuration retrieved from CloudFormation stack
- [x] Environment variables identified

## 🚀 Quick Deploy (Recommended: AWS Console)

### Step 1: Open AWS Amplify Console

Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1

### Step 2: Create New App

1. Click **"New app"** → **"Host web app"**
2. Select your Git provider:
   - **GitHub** (recommended)
   - **GitLab**
   - **Bitbucket**
   - **AWS CodeCommit**

### Step 3: Connect Repository

1. **Authorize** AWS Amplify to access your Git provider
2. **Select repository**: `Company-Intelligence-Podcast`
3. **Select branch**: `main` or `master`
4. Click **"Next"**

### Step 4: Configure Build Settings

AWS Amplify will auto-detect Next.js. Verify these settings:

**Build settings:**
- **Build command**: `npm run build`
- **Output directory**: `.next`
- **Base directory**: (leave empty)

If auto-detection doesn't work, use these settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### Step 5: Add Environment Variables

Go to **"Advanced settings"** → **"Environment variables"** and add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com` |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `us-east-1_lvLcARe2P` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | `3lm7s5lml6i0va070cm1c3uafn` |
| `NEXT_PUBLIC_AWS_REGION` | `us-east-1` |
| `ACCOUNT_ID` | `098478926952` |
| `REGION` | `us-east-1` |
| `S3_BUCKET_MEDIA` | `podcast-platform-media-098478926952` |
| `NEXT_DISABLE_ESLINT` | `true` |

**Note**: 
- Amplify doesn't allow environment variables starting with "AWS" prefix, so we use `ACCOUNT_ID` and `REGION` instead
- Amplify uses IAM roles for S3 access, so you don't need to set `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`
- The `ACCOUNT_ID` (or `S3_BUCKET_MEDIA`) is needed for the serve-file route to know which S3 bucket to read from

### Step 6: Deploy

1. Click **"Save and deploy"**
2. Wait for build to complete (~5-10 minutes for first deployment)
3. Your app will be live at: `https://main.xxxxxxxxxxxx.amplifyapp.com`

## 🔄 Automated Deployment Script

Run the setup script to get all configuration values:

```powershell
npm run deploy:amplify:setup
```

Or directly:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-amplify.ps1
```

## 📝 Alternative: CLI Deployment

If you prefer CLI (requires interactive setup):

```powershell
# Initialize Amplify project
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

**Note**: CLI approach requires answering interactive prompts. Console approach is recommended.

## 🔗 Backend Integration

Your frontend will automatically connect to your existing AWS backend:

- **API Gateway**: `https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com`
- **Cognito User Pool**: `us-east-1_lvLcARe2P`
- **Cognito Client**: `3lm7s5lml6i0va070cm1c3uafn`
- **Region**: `us-east-1`

## 🎯 Post-Deployment

### Custom Domain (Optional)

1. Go to **App Settings** → **Domain management**
2. Click **"Add domain"**
3. Enter your domain name
4. Follow DNS configuration instructions
5. SSL certificate is automatically provisioned

### Branch Previews

Amplify automatically creates preview deployments for:
- Pull requests
- Feature branches
- Development branches

### Monitoring

- **Build logs**: Available in Amplify Console
- **Deployment history**: Track all deployments
- **Performance metrics**: Monitor app performance

## 🔧 Troubleshooting

### Build Fails

**Issue**: Build errors during deployment

**Solution**:
1. Check build logs in Amplify Console
2. Verify `amplify.yml` is correct
3. Ensure all dependencies are in `package.json`
4. Check Node.js version (should be 18+)

### Environment Variables Not Working

**Issue**: Frontend can't connect to backend

**Solution**:
1. Verify environment variables are set correctly
2. Ensure variables start with `NEXT_PUBLIC_` for client-side access
3. Redeploy after adding/changing variables

### API Connection Errors

**Issue**: CORS or API errors

**Solution**:
1. Verify API Gateway CORS settings
2. Check API Gateway URL is correct
3. Ensure Cognito credentials are correct

## 📊 Cost Estimate

- **Free Tier**: 1,000 build minutes/month, 15GB storage, 5GB data transfer
- **After Free Tier**: ~$0.01 per build minute
- **Estimated Monthly Cost**: $5-15 for moderate usage

## 🎉 Success!

Once deployed, your app will be:
- ✅ Globally distributed via CloudFront
- ✅ Auto-scaling
- ✅ SSL secured
- ✅ Connected to your AWS backend
- ✅ Automatically deploying on Git push

## 📚 Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Next.js on Amplify](https://docs.amplify.aws/guides/hosting/nextjs/q/platform/js/)
- [Amplify Console](https://console.aws.amazon.com/amplify/)

---

**Last Updated**: 2024-11-17  
**Backend Status**: ✅ Deployed  
**Frontend Status**: Ready for Amplify deployment

