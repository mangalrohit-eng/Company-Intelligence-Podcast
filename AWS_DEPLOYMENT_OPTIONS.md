# AWS Deployment Options Review

Since Vercel is not working reliably, here are the AWS deployment options for your Next.js application:

## Current Infrastructure Status

Your CDK stack (`infra/cdk/lib/podcast-platform-stack.ts`) already includes:
- ✅ DynamoDB tables (podcasts, runs, episodes, run_events)
- ✅ S3 buckets (media, RSS, frontend)
- ✅ Lambda functions (API handlers)
- ✅ API Gateway (HTTP API)
- ✅ Cognito (authentication)
- ✅ CloudFront (CDN)
- ✅ Step Functions (pipeline orchestration)
- ✅ ECS Cluster (for future container deployment)

## Deployment Options

### Option 1: AWS Amplify (Recommended for Next.js) ⭐

**Best for:** Full Next.js support with API routes, SSR, and ISR

**Pros:**
- ✅ Native Next.js support (API routes work automatically)
- ✅ Automatic builds from Git
- ✅ Built-in CI/CD
- ✅ Environment variable management
- ✅ Automatic SSL certificates
- ✅ Preview deployments for branches
- ✅ Easy rollbacks
- ✅ No infrastructure code changes needed

**Cons:**
- ⚠️ Additional service to learn
- ⚠️ Slightly higher cost (~$15-25/month base)
- ⚠️ Less control over infrastructure

**Setup:**
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

**Cost:** ~$15-25/month + usage

---

### Option 2: ECS Fargate + Application Load Balancer

**Best for:** Full control, container-based deployment

**Pros:**
- ✅ Full Next.js support (API routes, SSR)
- ✅ Complete control over infrastructure
- ✅ Can run long-running processes (pipeline)
- ✅ Better for complex workloads
- ✅ Auto-scaling capabilities

**Cons:**
- ⚠️ More complex setup
- ⚠️ Requires Docker containerization
- ⚠️ Higher cost (~$30-50/month minimum)
- ⚠️ Need to update CDK stack

**What's needed:**
1. Create Dockerfile for Next.js app
2. Update CDK stack to add:
   - ECS Fargate service
   - Application Load Balancer
   - Task definition
   - Auto-scaling policies

**Cost:** ~$30-50/month + usage

---

### Option 3: Lambda + API Gateway (Current Partial Setup)

**Best for:** Serverless, cost-effective, but limited

**Pros:**
- ✅ Already partially set up
- ✅ Very cost-effective (~$5-10/month)
- ✅ Auto-scaling
- ✅ Pay per request

**Cons:**
- ⚠️ Next.js API routes need to be converted to Lambda functions
- ⚠️ 15-minute timeout limit (can be extended to 15 min)
- ⚠️ Cold starts
- ⚠️ Complex for long-running pipeline stages

**Current Status:**
- Lambda functions exist for some API endpoints
- Need to convert all `/api/*` routes to Lambda functions
- Frontend needs to call API Gateway URLs instead of `/api/*`

**Cost:** ~$5-10/month + usage

---

### Option 4: EC2 Instance (Traditional)

**Best for:** Maximum control, simplest migration

**Pros:**
- ✅ Full Next.js support
- ✅ Complete control
- ✅ Can run anything
- ✅ Easy to debug

**Cons:**
- ⚠️ Manual server management
- ⚠️ Need to handle SSL, updates, backups
- ⚠️ Higher cost (~$20-40/month)
- ⚠️ Not serverless

**Setup:**
1. Launch EC2 instance (t3.medium recommended)
2. Install Node.js, PM2
3. Clone repo, build, run
4. Set up Nginx reverse proxy
5. Configure SSL with Let's Encrypt

**Cost:** ~$20-40/month

---

### Option 5: Hybrid: Static Frontend + API Gateway

**Best for:** Current setup, minimal changes

**Pros:**
- ✅ Uses existing CDK infrastructure
- ✅ Fast frontend (CloudFront)
- ✅ Serverless backend
- ✅ Minimal code changes

**Cons:**
- ⚠️ Need to convert API routes to Lambda
- ⚠️ Frontend must call API Gateway URLs
- ⚠️ More complex frontend code

**What's needed:**
1. Convert all `/api/*` routes to Lambda functions (already started)
2. Update frontend to use API Gateway URLs
3. Deploy frontend as static export to S3/CloudFront

**Cost:** ~$10-15/month

---

## Recommendation Matrix

| Option | Next.js API Routes | Setup Complexity | Cost/Month | Best For |
|--------|-------------------|------------------|------------|----------|
| **Amplify** | ✅ Full Support | Low | $15-25 | Quick deployment, full Next.js |
| **ECS Fargate** | ✅ Full Support | High | $30-50 | Production, long-running tasks |
| **Lambda + API Gateway** | ⚠️ Need conversion | Medium | $5-10 | Serverless, cost-effective |
| **EC2** | ✅ Full Support | Medium | $20-40 | Maximum control |
| **Hybrid (Current)** | ⚠️ Need conversion | Low | $10-15 | Minimal changes |

---

## My Recommendation: AWS Amplify

Given your current situation with Vercel, **AWS Amplify** is the best choice because:

1. **Zero code changes needed** - Your Next.js app will work as-is
2. **API routes work automatically** - No conversion needed
3. **Easy deployment** - Connect GitHub, auto-deploys on push
4. **Built-in features** - SSL, CDN, environment variables
5. **Quick setup** - Can be running in 30 minutes

### Quick Start with Amplify

```powershell
# 1. Install Amplify CLI
npm install -g @aws-amplify/cli

# 2. Configure Amplify
amplify configure

# 3. Initialize in your project
amplify init
# Choose: Next.js, us-east-1, default settings

# 4. Add hosting
amplify add hosting
# Choose: Hosting with Amplify Console

# 5. Deploy
amplify publish
```

### Alternative: Use Amplify Console (Web UI)

1. Go to AWS Amplify Console
2. Click "New App" → "Host web app"
3. Connect GitHub repository
4. Select branch (main)
5. Build settings (auto-detected for Next.js)
6. Add environment variables
7. Deploy

---

## Next Steps

**If choosing Amplify:**
1. Set up Amplify (30 min)
2. Connect GitHub repo
3. Configure environment variables
4. Deploy
5. Update any hardcoded URLs

**If choosing ECS Fargate:**
1. Create Dockerfile
2. Update CDK stack
3. Build and push Docker image
4. Deploy updated stack
5. Configure ALB and domain

**If choosing to fix current setup:**
1. Convert remaining API routes to Lambda
2. Update frontend API calls
3. Deploy frontend as static export
4. Test end-to-end

---

## Questions to Consider

1. **Do you need full Next.js API routes?** → Amplify or ECS
2. **Budget constraints?** → Lambda + API Gateway
3. **Need long-running processes?** → ECS Fargate
4. **Want quickest deployment?** → Amplify
5. **Maximum control?** → EC2 or ECS

---

**Which option would you like to pursue?**

