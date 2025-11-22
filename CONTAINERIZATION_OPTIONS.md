# 🐳 Containerization Options for AWS Hosting

## Current State Analysis

**What's Already Containerized:**
- ❌ Nothing yet - No Dockerfiles exist
- ✅ ECS Fargate infrastructure is ready (cluster created)
- ✅ Step Functions configured to invoke ECS tasks for scraping

**What Needs Containerization:**
1. **Frontend (Next.js)** - Currently static export to S3
2. **Pipeline Engine** - Currently runs locally or via Lambda
3. **Scraper Service** - Planned for ECS Fargate (infrastructure ready)
4. **API Backend** - Currently Lambda (could be containerized for long-running tasks)

---

## AWS Containerization Options

### **Option 1: ECS Fargate** ⭐ **RECOMMENDED**

**Best for:** Serverless containers, no infrastructure management

#### **Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    ECS Fargate                          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Frontend      │  │ Pipeline    │  │ Scraper      │ │
│  │ Container     │  │ Engine      │  │ Container    │ │
│  │ (Next.js)     │  │ Container   │  │ (Playwright) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  - Auto-scaling based on CPU/memory                     │
│  - Pay per task execution                                │
│  - Integrated with ALB/API Gateway                       │
└─────────────────────────────────────────────────────────┘
```

#### **Pros:**
- ✅ **Serverless** - No EC2 instances to manage
- ✅ **Auto-scaling** - Scales based on demand
- ✅ **Cost-effective** - Pay only for running tasks
- ✅ **Already partially set up** - ECS cluster exists
- ✅ **VPC integration** - Can run in private subnets
- ✅ **Works with Step Functions** - Already configured
- ✅ **Security** - IAM roles per task

#### **Cons:**
- ⚠️ **Cold starts** - 10-30 seconds for new tasks
- ⚠️ **15-minute max** - Tasks timeout after 15 minutes (can be extended)
- ⚠️ **No persistent storage** - Use S3/EBS for data

#### **Use Cases:**
- ✅ Scraper service (already planned)
- ✅ Pipeline engine (long-running stages)
- ✅ Frontend (if you want SSR instead of static)
- ✅ Background workers

#### **Cost Estimate:**
- **CPU**: $0.04048 per vCPU per hour
- **Memory**: $0.004445 per GB per hour
- **Example**: 1 vCPU, 2GB RAM = ~$0.05/hour = ~$36/month if running 24/7
- **Better for**: Sporadic workloads (pay per task)

#### **Implementation:**
```typescript
// infra/cdk/lib/podcast-platform-stack.ts
const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
  memoryLimitMiB: 2048,
  cpu: 1024,
});

taskDefinition.addContainer('scraper', {
  image: ecs.ContainerImage.fromAsset('./containers/scraper'),
  environment: {
    RUN_ID: '...',
  },
});
```

---

### **Option 2: ECS EC2** 

**Best for:** Long-running services, predictable workloads, cost optimization

#### **Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    ECS on EC2                           │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ EC2 Instance │  │ EC2 Instance  │  │ EC2 Instance  │ │
│  │ (t3.medium)  │  │ (t3.medium)   │  │ (t3.medium)   │ │
│  │              │  │              │  │              │ │
│  │ Containers:  │  │ Containers:   │  │ Containers:  │ │
│  │ - Frontend   │  │ - Pipeline    │  │ - Scraper    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  - Auto-scaling group                                   │
│  - Multiple containers per instance                     │
│  - Persistent EBS volumes                               │
└─────────────────────────────────────────────────────────┘
```

#### **Pros:**
- ✅ **Cost-effective** - For 24/7 workloads, cheaper than Fargate
- ✅ **No time limits** - Can run indefinitely
- ✅ **More control** - Full EC2 instance control
- ✅ **Persistent storage** - EBS volumes
- ✅ **Better for batch jobs** - Long-running tasks

#### **Cons:**
- ❌ **Infrastructure management** - Must manage EC2 instances
- ❌ **Scaling delays** - Takes time to launch new instances
- ❌ **Fixed costs** - Pay for instances even when idle
- ❌ **More complex** - Auto-scaling groups, load balancers

#### **Use Cases:**
- ✅ Always-on services
- ✅ High-throughput workloads
- ✅ Cost optimization for predictable traffic

#### **Cost Estimate:**
- **t3.medium**: ~$30/month per instance
- **Better for**: 24/7 workloads with predictable traffic

---

### **Option 3: AWS App Runner** ⭐ **EASIEST**

**Best for:** Simple web apps, minimal configuration

#### **Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    AWS App Runner                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Container Service (Managed)                      │ │
│  │  - Auto-scales                                    │ │
│  │  - Load balancing                                 │ │
│  │  - HTTPS endpoint                                 │ │
│  │  - Zero infrastructure management                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                          │
│  - Source: ECR, GitHub, or Bitbucket                    │
│  - Automatic deployments                                │
│  - Health checks                                        │
└─────────────────────────────────────────────────────────┘
```

#### **Pros:**
- ✅ **Simplest** - Minimal configuration
- ✅ **Auto-scaling** - Automatic based on traffic
- ✅ **Auto-deploy** - Deploy from source control
- ✅ **HTTPS included** - SSL certificates managed
- ✅ **Load balancing** - Built-in
- ✅ **Health checks** - Automatic

#### **Cons:**
- ⚠️ **Limited customization** - Less control than ECS
- ⚠️ **VPC limitations** - Limited VPC integration
- ⚠️ **Cost** - Can be more expensive than ECS for high traffic
- ⚠️ **No Step Functions integration** - Can't be invoked by Step Functions

#### **Use Cases:**
- ✅ Frontend applications
- ✅ Simple API services
- ✅ Quick deployments
- ❌ Not suitable for: Scraper (needs VPC), Pipeline (needs Step Functions)

#### **Cost Estimate:**
- **CPU**: $0.007 per vCPU per hour
- **Memory**: $0.0008 per GB per hour
- **Example**: 1 vCPU, 2GB = ~$0.01/hour = ~$7/month if running 24/7
- **Plus**: Data transfer costs

---

### **Option 4: Lambda Containers**

**Best for:** Large Lambda functions (>10MB), custom runtimes

#### **Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    Lambda (Container Image)             │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Container    │  │ Container    │  │ Container    │ │
│  │ Image        │  │ Image        │  │ Image        │ │
│  │ (Pipeline)   │  │ (Scraper)    │  │ (API)        │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  - Up to 10GB container images                          │
│  - Up to 10GB ephemeral storage                        │
│  - 15-minute max execution                              │
└─────────────────────────────────────────────────────────┘
```

#### **Pros:**
- ✅ **Large packages** - Up to 10GB images
- ✅ **Custom runtimes** - Any runtime you want
- ✅ **Serverless** - No infrastructure
- ✅ **Step Functions** - Already integrated
- ✅ **Cost-effective** - Pay per invocation

#### **Cons:**
- ⚠️ **15-minute limit** - Max execution time
- ⚠️ **Cold starts** - Slower than regular Lambda
- ⚠️ **Not for long-running** - Better for short tasks
- ⚠️ **Complexity** - Need to build/push images

#### **Use Cases:**
- ✅ Large dependencies (Playwright, ML models)
- ✅ Custom runtimes
- ✅ Pipeline stages (if they fit in 15 min)
- ❌ Not for: Long-running scrapers

#### **Cost Estimate:**
- Same as regular Lambda: $0.20 per 1M requests + compute time
- **Better for**: Event-driven, short tasks

---

### **Option 5: Elastic Beanstalk (Docker)**

**Best for:** Traditional web apps, easy deployment

#### **Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    Elastic Beanstalk                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ EC2 Instance │  │ EC2 Instance  │  │ Load Balancer│ │
│  │ (Docker)     │  │ (Docker)      │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  - Managed platform                                     │
│  - Auto-scaling                                         │
│  - Health monitoring                                    │
└─────────────────────────────────────────────────────────┘
```

#### **Pros:**
- ✅ **Easy deployment** - `eb deploy` command
- ✅ **Auto-scaling** - Built-in
- ✅ **Health monitoring** - Automatic
- ✅ **Familiar** - Traditional web app model

#### **Cons:**
- ❌ **Less flexible** - Platform limitations
- ❌ **EC2 costs** - Pay for instances
- ❌ **Not serverless** - Infrastructure management
- ❌ **Not modern** - Older AWS service

#### **Use Cases:**
- ✅ Traditional web applications
- ✅ Teams familiar with traditional hosting
- ❌ Not recommended for new projects

---

## 🎯 **Recommended Architecture**

Based on your current setup, here's the recommended containerization strategy:

### **Hybrid Approach** (Best of all worlds)

```
┌─────────────────────────────────────────────────────────┐
│                    COMPONENT BREAKDOWN                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. FRONTEND                                            │
│     Option A: Keep static export (S3 + CloudFront) ✅  │
│     Option B: ECS Fargate (if you need SSR)            │
│                                                          │
│  2. API ENDPOINTS                                       │
│     Keep as Lambda ✅ (already working)                 │
│     OR Lambda Containers (if packages get too large)    │
│                                                          │
│  3. SCRAPER SERVICE                                     │
│     ECS Fargate ✅ (already planned)                    │
│     - Long-running tasks                                │
│     - VPC access needed                                 │
│     - Invoked by Step Functions                         │
│                                                          │
│  4. PIPELINE ENGINE                                     │
│     Option A: Keep as Lambda (if < 15 min) ✅          │
│     Option B: ECS Fargate (if > 15 min)                 │
│     Option C: Lambda Containers (if large deps)         │
│                                                          │
│  5. BACKGROUND WORKERS                                  │
│     ECS Fargate ✅                                       │
│     - Scheduled tasks                                   │
│     - Event-driven tasks                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **Recommended Implementation Plan**

#### **Phase 1: Containerize Scraper** (Priority 1)
- ✅ ECS Fargate infrastructure already exists
- ✅ Step Functions already configured
- **Action**: Create Dockerfile for scraper service

#### **Phase 2: Containerize Pipeline Engine** (Priority 2)
- If pipeline stages exceed 15 minutes → Move to ECS Fargate
- If pipeline needs large dependencies → Use Lambda Containers
- **Action**: Evaluate current execution times

#### **Phase 3: Frontend (Optional)**
- Keep static export if possible (cheaper, faster)
- Move to ECS Fargate only if you need SSR
- **Action**: Evaluate SSR requirements

---

## 📋 **Implementation Checklist**

### **Step 1: Create Dockerfiles**

#### **Scraper Dockerfile** (`containers/scraper/Dockerfile`)
```dockerfile
FROM node:18-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Install Playwright browsers
RUN npx playwright install chromium

# Run scraper
CMD ["node", "dist/scraper/index.js"]
```

#### **Pipeline Engine Dockerfile** (`containers/pipeline/Dockerfile`)
```dockerfile
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Run pipeline
CMD ["node", "dist/engine/orchestrator.js"]
```

#### **Frontend Dockerfile** (`containers/frontend/Dockerfile`) - Optional
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### **Step 2: Build and Push to ECR**

```bash
# Create ECR repositories
aws ecr create-repository --repository-name podcast-scraper
aws ecr create-repository --repository-name podcast-pipeline

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push scraper
cd containers/scraper
docker build -t podcast-scraper .
docker tag podcast-scraper:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/podcast-scraper:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/podcast-scraper:latest
```

### **Step 3: Update CDK Stack**

```typescript
// Add ECR repository
const scraperRepo = ecr.Repository.fromRepositoryName(
  this,
  'ScraperRepo',
  'podcast-scraper'
);

// Create task definition
const scraperTaskDef = new ecs.FargateTaskDefinition(this, 'ScraperTaskDef', {
  memoryLimitMiB: 2048,
  cpu: 1024,
});

scraperTaskDef.addContainer('scraper', {
  image: ecs.ContainerImage.fromEcrRepository(scraperRepo, 'latest'),
  logging: ecs.LogDrivers.awsLogs({
    streamPrefix: 'scraper',
  }),
  environment: {
    AWS_REGION: this.region,
  },
});
```

---

## 💰 **Cost Comparison**

| Option | Monthly Cost (Low Traffic) | Monthly Cost (High Traffic) | Best For |
|--------|---------------------------|----------------------------|----------|
| **ECS Fargate** | $10-30 | $50-200 | Sporadic workloads |
| **ECS EC2** | $30-60 | $100-500 | 24/7 services |
| **App Runner** | $7-15 | $50-300 | Simple web apps |
| **Lambda Containers** | $5-10 | $20-100 | Event-driven |
| **Elastic Beanstalk** | $30-60 | $100-500 | Traditional apps |

**Note**: Costs vary based on:
- Traffic volume
- Container size (CPU/memory)
- Execution time
- Data transfer

---

## 🚀 **Quick Start: Containerize Scraper**

Since your scraper is already planned for ECS Fargate, here's the quickest path:

1. **Create Dockerfile** (see above)
2. **Build and push to ECR**
3. **Update CDK stack** to use ECR image
4. **Deploy**: `npm run deploy`

**Estimated time**: 2-3 hours

---

## 📚 **Additional Resources**

- [ECS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Last Updated**: 2025-01-17  
**Recommendation**: Start with **ECS Fargate** for scraper, keep Lambda for API, evaluate pipeline engine based on execution time.

