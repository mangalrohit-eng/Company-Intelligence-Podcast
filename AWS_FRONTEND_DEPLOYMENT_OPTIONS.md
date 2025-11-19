# AWS Frontend Deployment Options

Since your backend is already deployed on AWS, here are the best options for deploying your Next.js 14 frontend:

---

## 🎯 Option 1: AWS Amplify (Recommended for Next.js)

**Best for:** Full Next.js features, automatic deployments, CI/CD integration

### Pros
- ✅ Native Next.js support (SSR, ISR, API routes)
- ✅ Automatic builds from Git (GitHub, GitLab, Bitbucket)
- ✅ Built-in CI/CD pipeline
- ✅ Automatic SSL certificates
- ✅ Custom domain support
- ✅ Preview deployments for branches
- ✅ Environment variable management
- ✅ No need for static export

### Cons
- ⚠️ Slightly more expensive than S3/CloudFront
- ⚠️ Less control over infrastructure

### Setup Steps

1. **Install Amplify CLI** (if not already installed):
```powershell
npm install -g @aws-amplify/cli
```

2. **Initialize Amplify**:
```powershell
amplify init
```

3. **Add Hosting**:
```powershell
amplify add hosting
# Select: Hosting with Amplify Console
```

4. **Connect to Git Repository**:
- Go to AWS Amplify Console
- Click "New app" → "Host web app"
- Connect your GitHub/GitLab repository
- Amplify will auto-detect Next.js and configure build settings

5. **Configure Build Settings** (if needed):
Create `amplify.yml` in your project root:
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

6. **Set Environment Variables** in Amplify Console:
- `NEXT_PUBLIC_API_URL` → Your API Gateway URL
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID` → From your CDK stack
- `NEXT_PUBLIC_COGNITO_CLIENT_ID` → From your CDK stack
- `NEXT_PUBLIC_AWS_REGION` → us-east-1

### Cost
- **Free tier**: 1,000 build minutes/month, 15GB storage, 5GB data transfer
- **Paid**: ~$0.01 per build minute after free tier
- **Estimated**: $5-15/month for moderate usage

---

## 🚀 Option 2: S3 + CloudFront (Current Setup)

**Best for:** Static sites, maximum control, lowest cost

### Pros
- ✅ Very low cost
- ✅ Global CDN (CloudFront)
- ✅ High performance
- ✅ Full control over infrastructure
- ✅ Already implemented in your project

### Cons
- ⚠️ Requires static export (no SSR/API routes)
- ⚠️ Manual deployment process
- ⚠️ Need to handle routing manually

### Current Implementation

Your project already has this set up! To deploy:

```powershell
npm run deploy:frontend
```

This script:
1. Builds Next.js with static export
2. Syncs to S3 bucket
3. Invalidates CloudFront cache

### Configuration Required

Update `next.config.mjs` to enable static export:
```javascript
output: 'export'  // Already conditionally enabled
```

### Cost
- **S3**: ~$0.023/GB storage + $0.005/1,000 requests
- **CloudFront**: First 1TB free, then ~$0.085/GB
- **Estimated**: $2-5/month for moderate traffic

---

## 🐳 Option 3: ECS Fargate (Containerized)

**Best for:** Full Next.js features, container orchestration, scaling needs

### Pros
- ✅ Full Next.js support (SSR, API routes)
- ✅ Auto-scaling
- ✅ Container-based (consistent environments)
- ✅ Can use existing ECS cluster

### Cons
- ⚠️ More complex setup
- ⚠️ Higher cost (always-on containers)
- ⚠️ Requires Docker knowledge

### Setup Steps

1. **Create Dockerfile**:
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

2. **Build and Push to ECR**:
```powershell
# Create ECR repository
aws ecr create-repository --repository-name podcast-frontend

# Build and push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 098478926952.dkr.ecr.us-east-1.amazonaws.com
docker build -t podcast-frontend .
docker tag podcast-frontend:latest 098478926952.dkr.ecr.us-east-1.amazonaws.com/podcast-frontend:latest
docker push 098478926952.dkr.ecr.us-east-1.amazonaws.com/podcast-frontend:latest
```

3. **Update CDK Stack** to add ECS service:
```typescript
// Add to podcast-platform-stack.ts
const frontendService = new ecs.FargateService(this, 'FrontendService', {
  cluster: yourCluster,
  taskDefinition: frontendTaskDef,
  desiredCount: 1,
  assignPublicIp: true,
});
```

4. **Add Application Load Balancer** for public access

### Cost
- **Fargate**: ~$0.04/vCPU-hour + $0.004/GB-hour
- **ALB**: ~$0.0225/hour (~$16/month)
- **Estimated**: $30-50/month minimum

---

## ⚡ Option 4: Lambda@Edge + CloudFront

**Best for:** Edge computing, dynamic routing, low latency

### Pros
- ✅ Edge functions (runs close to users)
- ✅ Dynamic routing support
- ✅ Low latency
- ✅ Pay per request

### Cons
- ⚠️ Complex setup
- ⚠️ Limited execution time (5-30 seconds)
- ⚠️ Not ideal for full Next.js apps
- ⚠️ Cold starts

### Use Case
Best for specific edge functions, not full app deployment.

---

## 🖥️ Option 5: EC2 (Traditional Server)

**Best for:** Full control, existing infrastructure, specific requirements

### Pros
- ✅ Complete control
- ✅ Can run any setup
- ✅ Predictable costs

### Cons
- ⚠️ Manual server management
- ⚠️ No auto-scaling (unless using Auto Scaling Groups)
- ⚠️ Need to handle SSL, updates, security
- ⚠️ Higher operational overhead

### Setup
1. Launch EC2 instance (t3.small or larger)
2. Install Node.js, PM2
3. Clone repository
4. Set up Nginx reverse proxy
5. Configure SSL with Let's Encrypt
6. Set up auto-scaling if needed

### Cost
- **EC2 t3.small**: ~$15/month
- **Estimated**: $20-40/month with setup

---

## 📊 Comparison Matrix

| Option | Cost/Month | Setup Complexity | Next.js Features | Auto-Scaling | CI/CD |
|--------|-----------|------------------|------------------|--------------|-------|
| **Amplify** | $5-15 | ⭐ Easy | ✅ Full | ✅ Yes | ✅ Built-in |
| **S3+CloudFront** | $2-5 | ⭐⭐ Medium | ⚠️ Static only | ✅ Yes | ⚠️ Manual |
| **ECS Fargate** | $30-50 | ⭐⭐⭐ Complex | ✅ Full | ✅ Yes | ⚠️ Manual |
| **Lambda@Edge** | $5-10 | ⭐⭐⭐ Very Complex | ⚠️ Limited | ✅ Yes | ⚠️ Manual |
| **EC2** | $20-40 | ⭐⭐⭐ Very Complex | ✅ Full | ⚠️ Manual | ⚠️ Manual |

---

## 🎯 Recommendation

### For Your Use Case:

**Option 1: AWS Amplify** (Best Choice)
- Your Next.js app has dynamic features that benefit from SSR
- You want automatic deployments from Git
- You need API routes support
- Minimal operational overhead

**Option 2: S3 + CloudFront** (Current - Good for Now)
- Already implemented
- Lowest cost
- Works if you don't need SSR/API routes
- Can migrate to Amplify later

---

## 🔄 Migration Path

If you want to migrate from S3+CloudFront to Amplify:

1. **Keep current setup working**
2. **Set up Amplify** in parallel
3. **Test Amplify deployment**
4. **Switch DNS/domain** when ready
5. **Decommission S3+CloudFront** setup

---

## 📝 Quick Start: Deploy to Amplify

```powershell
# 1. Install Amplify CLI
npm install -g @aws-amplify/cli

# 2. Initialize (if starting fresh)
amplify init

# 3. Add hosting
amplify add hosting

# 4. Publish
amplify publish
```

Or use the AWS Console:
1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect your Git repository
4. Configure environment variables
5. Deploy!

---

## 🔗 Integration with Existing Backend

All options work with your existing backend:
- **API Gateway URL**: Use `NEXT_PUBLIC_API_URL` environment variable
- **Cognito**: Use `NEXT_PUBLIC_COGNITO_USER_POOL_ID` and `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- **Region**: Set `NEXT_PUBLIC_AWS_REGION=us-east-1`

Your frontend will automatically connect to the deployed backend infrastructure.

---

## 📚 Additional Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Next.js on AWS](https://nextjs.org/docs/deployment#aws-amplify)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [ECS Fargate Documentation](https://docs.aws.amazon.com/ecs/latest/developerguide/AWS_Fargate.html)

---

**Last Updated**: 2024-11-17  
**Backend Status**: ✅ Deployed on AWS  
**Current Frontend**: S3 + CloudFront (static export)

