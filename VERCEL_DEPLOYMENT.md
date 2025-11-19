# Vercel Deployment Guide

## Quick Deploy

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

2. **Set Environment Variables**
   In Vercel dashboard → Settings → Environment Variables:
   ```
   # Frontend Configuration (Client-side)
   NEXT_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
   NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx
   
   # AWS Credentials (Server-side - Required for DynamoDB access)
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   
   # OpenAI (Server-side - Optional, for AI features)
   OPENAI_API_KEY=sk-proj-xxxxx
   ```
   
   **⚠️ IMPORTANT:** The AWS credentials are required for your API routes (`/api/podcasts`, etc.) to connect to DynamoDB. Without these, podcasts won't be visible on Vercel even though they exist in AWS.

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

**Required for Vercel (Client-side):**
- `NEXT_PUBLIC_API_URL` - Your AWS API Gateway URL (if using API Gateway)
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID
- `NEXT_PUBLIC_COGNITO_CLIENT_ID` - AWS Cognito Client ID

**Required for Vercel (Server-side - API Routes):**
- `AWS_REGION` - AWS region (e.g., `us-east-1`)
- `AWS_ACCESS_KEY_ID` - AWS access key with DynamoDB permissions
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key

**Optional (Server-side):**
- `OPENAI_API_KEY` - Only if you need OpenAI on server-side (API routes)

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

### "No podcasts visible on Vercel"
**This is the most common issue!** Your podcasts are stored in AWS DynamoDB, but Vercel needs AWS credentials to access them.

**Quick Debug Steps:**

1. **Check the debug endpoint:**
   - Visit: `https://your-vercel-app.vercel.app/api/debug/aws`
   - This will show you exactly what's wrong with your AWS configuration

2. **Verify Environment Variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Make sure these are set for **Production** environment:
     - `AWS_REGION=us-east-1` (or your region)
     - `AWS_ACCESS_KEY_ID=AKIA...` (your AWS access key)
     - `AWS_SECRET_ACCESS_KEY=...` (your AWS secret key)
   - ⚠️ **Important:** Check the "Environment" dropdown - make sure they're set for "Production" (not just Preview/Development)

3. **Redeploy after adding variables:**
   - Go to Vercel → Deployments → Click "..." on latest deployment → "Redeploy"
   - Environment variables are only loaded during build/deployment

4. **Check Vercel Function Logs:**
   - Go to Vercel → Your Project → Functions → Click on `/api/podcasts`
   - Look for error messages in the logs
   - Common errors:
     - `ResourceNotFoundException` = Table doesn't exist or wrong region
     - `UnrecognizedClientException` = Invalid credentials
     - `AccessDeniedException` = Credentials don't have DynamoDB permissions

5. **Verify AWS Permissions:**
   - Your IAM user/role needs these DynamoDB permissions:
     - `dynamodb:Scan`
     - `dynamodb:GetItem`
     - `dynamodb:PutItem`
     - `dynamodb:UpdateItem`
     - `dynamodb:DeleteItem`
     - `dynamodb:Query`
     - `dynamodb:ListTables` (for debug endpoint)

**Security Note:** 
- These credentials should have **minimal permissions** (only DynamoDB read/write access)
- Consider creating an IAM user specifically for Vercel with limited permissions
- Never commit these credentials to git

