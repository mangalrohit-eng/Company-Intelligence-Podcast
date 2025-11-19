# 🚀 Deploy to AWS Amplify NOW

## ⚡ Quick Steps (5 minutes)

### 1. Open AWS Amplify Console
**Click here**: https://console.aws.amazon.com/amplify/home?region=us-east-1#/create

### 2. Click "New app" → "Host web app"

### 3. Connect Your Git Repository
- Select **GitHub** (or your Git provider)
- **Authorize** AWS Amplify
- Select repository: **Company-Intelligence-Podcast**
- Select branch: **main** (or master)
- Click **"Next"**

### 4. Build Settings (Auto-detected - Just Verify)
- Build command: `npm run build` ✅
- Output directory: `.next` ✅
- Click **"Next"**

### 5. Add Environment Variables (IMPORTANT!)

Click **"Advanced settings"** → **"Environment variables"** → Add these:

```
NEXT_PUBLIC_API_URL=https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_lvLcARe2P
NEXT_PUBLIC_COGNITO_CLIENT_ID=3lm7s5lml6i0va070cm1c3uafn
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_DISABLE_ESLINT=true
```

### 6. Click "Save and deploy"

### 7. Wait 5-10 minutes

### 8. Get Your URL! 🎉

You'll see: `https://main.xxxxxxxxxxxx.amplifyapp.com`

---

## 🔧 Fix CloudFront (Optional - If You Want to Keep It)

If you want to fix the CloudFront issue instead:

### Option A: Redeploy CDK Stack (Recommended)
```powershell
npm run deploy
```
This will fix the CloudFront distribution to point to the correct bucket.

### Option B: Manual Fix in Console
1. Go to: https://console.aws.amazon.com/cloudfront/v3/home#/distributions
2. Click distribution: **EWOR6B4JSLK4**
3. Go to **"Origins"** tab
4. Edit the default origin
5. Change Domain Name to: `podcast-platform-frontend-098478926952.s3.us-east-1.amazonaws.com`
6. Save changes
7. Wait for deployment (~15 minutes)

---

## ✅ After Amplify Deployment

Your new production URL will be the Amplify URL (not CloudFront).

The app will:
- ✅ Work immediately (no AccessDenied errors)
- ✅ Auto-deploy on every Git push
- ✅ Support full Next.js features (SSR, API routes)
- ✅ Have branch previews for PRs

---

**Questions?** See `AMPLIFY_QUICK_DEPLOY.md` for detailed guide.

