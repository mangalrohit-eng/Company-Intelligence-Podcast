# 🚀 Quick AWS Amplify Deployment Guide

Your CloudFront setup has an issue (pointing to wrong bucket). Deploying to AWS Amplify will solve this and give you better Next.js support!

## ⚡ Fast Track Deployment (5 minutes)

### Step 1: Open AWS Amplify Console

**Direct Link**: https://console.aws.amazon.com/amplify/home?region=us-east-1#/create

### Step 2: Connect Repository

1. Click **"New app"** → **"Host web app"**
2. Select your Git provider:
   - **GitHub** (recommended)
   - **GitLab** 
   - **Bitbucket**
3. **Authorize** AWS Amplify
4. **Select repository**: `Company-Intelligence-Podcast`
5. **Select branch**: `main` or `master`
6. Click **"Next"**

### Step 3: Configure Build Settings

AWS Amplify will auto-detect Next.js. **Verify these settings:**

- **App name**: `podcast-platform` (or your choice)
- **Build command**: `npm run build`
- **Output directory**: `.next`
- **Base directory**: (leave empty)

**If auto-detection doesn't work**, click "Edit" and use:

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

### Step 4: Add Environment Variables

Click **"Advanced settings"** → **"Environment variables"** → **"Add variable"**

Add these **5 variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com` |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `us-east-1_lvLcARe2P` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | `3lm7s5lml6i0va070cm1c3uafn` |
| `NEXT_PUBLIC_AWS_REGION` | `us-east-1` |
| `NEXT_DISABLE_ESLINT` | `true` |

### Step 5: Deploy!

1. Click **"Save and deploy"**
2. Wait ~5-10 minutes for first build
3. Your app will be live! 🎉

## 📍 Your New URL

After deployment, you'll get a URL like:
```
https://main.xxxxxxxxxxxx.amplifyapp.com
```

This will be your **new production URL** (replacing the broken CloudFront URL).

## ✅ What This Fixes

- ✅ **CloudFront AccessDenied error** - Amplify handles hosting automatically
- ✅ **Full Next.js support** - SSR, API routes, ISR all work
- ✅ **Automatic deployments** - Every Git push triggers a new build
- ✅ **Branch previews** - PRs get their own preview URLs
- ✅ **Better performance** - Optimized Next.js hosting

## 🔄 After Deployment

### Update Your Documentation

Once deployed, update your URLs:
- Old (broken): `https://dhycfwg0k4xij.cloudfront.net`
- New (Amplify): `https://main.xxxxxxxxxxxx.amplifyapp.com`

### Automatic Deployments

Every time you push to your Git repository:
- Amplify automatically builds and deploys
- Preview URLs for pull requests
- Zero manual steps needed!

## 🆘 Troubleshooting

### Build Fails?

1. Check build logs in Amplify Console
2. Verify `amplify.yml` exists in root
3. Ensure all dependencies in `package.json`
4. Check Node.js version (should be 18+)

### Environment Variables Not Working?

1. Verify all variables start with `NEXT_PUBLIC_` for client-side
2. Redeploy after adding/changing variables
3. Check variable names match exactly

## 📊 Cost

- **Free Tier**: 1,000 build minutes/month
- **After Free Tier**: ~$0.01 per build minute
- **Estimated**: $5-15/month for moderate usage

## 🎉 Success!

Once deployed, your app will be:
- ✅ Live and accessible
- ✅ Connected to AWS backend
- ✅ Auto-deploying on Git push
- ✅ Globally distributed
- ✅ SSL secured

---

**Need Help?** Check the full guide: `AMPLIFY_DEPLOYMENT_GUIDE.md`

