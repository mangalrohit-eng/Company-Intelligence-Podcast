# Vercel Deployment Guide

## Quick Deploy

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

2. **Set Environment Variables**
   In Vercel dashboard → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
   NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx
   OPENAI_API_KEY=sk-proj-xxxxx (if needed for server-side)
   ```

3. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Your app will be live in ~2 minutes

## Configuration

### Current Setup
- ✅ **No static export** - Works perfectly on Vercel
- ✅ **API routes** - Work automatically on Vercel
- ✅ **Dynamic routes** - Work automatically on Vercel
- ✅ **Next.js App Router** - Fully supported

### Environment Variables

**Required for Vercel:**
- `NEXT_PUBLIC_API_URL` - Your AWS API Gateway URL
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID
- `NEXT_PUBLIC_COGNITO_CLIENT_ID` - AWS Cognito Client ID

**Optional:**
- `OPENAI_API_KEY` - Only if you need OpenAI on server-side (API routes)
- `AWS_REGION` - If needed for server-side AWS calls

### Build Settings

Vercel will automatically:
- Detect Next.js framework
- Run `npm run build`
- Deploy to edge network
- Handle API routes as serverless functions
- Handle dynamic routes automatically

**No special configuration needed!**

## Local vs Vercel vs AWS

| Feature | Local Dev | Vercel | AWS (Static Export) |
|---------|-----------|--------|---------------------|
| **Static Export** | ❌ Disabled | ❌ Not needed | ✅ Enabled (if `ENABLE_STATIC_EXPORT=true`) |
| **API Routes** | ✅ Works | ✅ Works | ❌ Need API Gateway |
| **Dynamic Routes** | ✅ Works | ✅ Works | ⚠️ Need `generateStaticParams()` |
| **Build Command** | `npm run dev` | `npm run build` | `npm run build` (with export) |

## Migration from AWS to Vercel

If you're currently on AWS and want to move to Vercel:

1. **Remove static export requirement:**
   - Already done! `ENABLE_STATIC_EXPORT` is not set by default
   
2. **Update environment variables:**
   - Copy from AWS to Vercel dashboard
   
3. **Deploy:**
   - Connect repo to Vercel
   - Set environment variables
   - Deploy

**That's it!** No code changes needed.

## Troubleshooting

### "API routes not working"
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Verify API Gateway CORS settings allow Vercel domain

### "Dynamic routes 404"
- This shouldn't happen on Vercel (handles automatically)
- Check build logs in Vercel dashboard

### "Environment variables not loading"
- Make sure they're set in Vercel dashboard
- Redeploy after adding new variables
- Use `NEXT_PUBLIC_` prefix for client-side variables

