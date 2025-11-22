# 🐳 Single Container Approach - Everything in One

## Overview

**One container to rule them all!** 🎯

Instead of multiple containers/services, run everything in a single container:
- ✅ Frontend (Next.js)
- ✅ API Routes (Next.js API)
- ✅ Pipeline Orchestrator
- ✅ All Pipeline Stages
- ✅ Everything together

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Single Container (ECS Fargate)             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js Server (Port 3000)                      │  │
│  │  - Frontend UI (React)                            │  │
│  │  - API Routes (/api/*)                            │  │
│  │  - Pipeline Orchestrator                          │  │
│  │  - All 13 Pipeline Stages                        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  - Single entry point                                   │
│  - One container to manage                              │
│  - Simple deployment                                    │
│  - All code in one place                                │
└─────────────────────────────────────────────────────────┘
         │
         ▼
    Application Load Balancer
         │
         ▼
    Users / API Gateway
```

---

## Pros & Cons

### ✅ **Pros:**
- **Simplest** - One container, one deployment
- **Easy to manage** - Single point of control
- **Fast development** - Everything runs together
- **No service discovery** - All code in one process
- **Easier debugging** - Single log stream
- **Cost effective** - One container instead of many
- **Local = Production** - Same environment everywhere

### ⚠️ **Cons:**
- **Scaling** - Can't scale frontend/backend separately
- **Resource limits** - All services share CPU/memory
- **Single point of failure** - If container crashes, everything goes down
- **Deployment** - Must redeploy entire container for any change
- **Long-running** - Next.js server runs 24/7 (costs money)

---

## Implementation

### **Step 1: Create Single Container Dockerfile**

Create `Dockerfile` (root level):

```dockerfile
# Single Container for Everything
# Next.js + API + Pipeline Orchestrator + All Stages

FROM node:18-slim

# Install Playwright dependencies (for scraper)
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
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY next.config.* ./
COPY tailwind.config.* ./
COPY postcss.config.* ./

# Install dependencies
RUN npm ci

# Copy all source code
COPY src/ ./src/
COPY public/ ./public/ 2>/dev/null || true
COPY containers/ ./containers/ 2>/dev/null || true
COPY scripts/ ./scripts/ 2>/dev/null || true

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Build Next.js application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js server
CMD ["npm", "start"]
```

### **Step 2: Add Health Check Endpoint**

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'podcast-platform',
  });
}
```

### **Step 3: Update Next.js Config for Standalone**

Update `next.config.mjs` (or create if doesn't exist):

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Important for containerization
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./src/**/*'],
    },
  },
};

export default nextConfig;
```

### **Step 4: Update CDK Stack**

Add single container service to `infra/cdk/lib/podcast-platform-stack.ts`:

```typescript
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';

// ... existing code ...

// ========================================================================
// Single Container: Everything in One
// ========================================================================

// ECR Repository for app container
const appRepo = new ecr.Repository(this, 'AppRepo', {
  repositoryName: 'podcast-platform-app',
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// IAM role for app tasks
const appTaskRole = new iam.Role(this, 'AppTaskRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  description: 'Role for app ECS tasks',
});

// Grant all necessary permissions
mediaBucket.grantReadWrite(appTaskRole);
rssBucket.grantReadWrite(appTaskRole);
runsTable.grantReadWriteData(appTaskRole);
eventsTable.grantWriteData(appTaskRole);
episodesTable.grantWriteData(appTaskRole);
podcastsTable.grantReadWriteData(appTaskRole);
podcastConfigsTable.grantReadWriteData(appTaskRole);
podcastCompetitorsTable.grantReadWriteData(appTaskRole);
podcastTopicsTable.grantReadWriteData(appTaskRole);

// Grant Secrets Manager access
appTaskRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['secretsmanager:GetSecretValue'],
  resources: ['*'],
}));

// Fargate task definition
const appTaskDef = new ecs.FargateTaskDefinition(this, 'AppTaskDef', {
  memoryLimitMiB: 4096,  // 4GB
  cpu: 2048,              // 2 vCPU
  taskRole: appTaskRole,
});

appTaskDef.addContainer('app', {
  image: ecs.ContainerImage.fromEcrRepository(appRepo, 'latest'),
  logging: ecs.LogDrivers.awsLogs({
    streamPrefix: 'app',
    logGroup: new logs.LogGroup(this, 'AppLogGroup', {
      logGroupName: '/ecs/podcast-platform-app',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    }),
  }),
  environment: {
    AWS_REGION: this.region,
    PODCASTS_TABLE: podcastsTable.tableName,
    PODCAST_CONFIGS_TABLE: podcastConfigsTable.tableName,
    PODCAST_COMPETITORS_TABLE: podcastCompetitorsTable.tableName,
    PODCAST_TOPICS_TABLE: podcastTopicsTable.tableName,
    RUNS_TABLE: runsTable.tableName,
    EVENTS_TABLE: eventsTable.tableName,
    EPISODES_TABLE: episodesTable.tableName,
    MEDIA_BUCKET: mediaBucket.bucketName,
    RSS_BUCKET: rssBucket.bucketName,
    USER_POOL_ID: userPool.userPoolId,
    USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
    NODE_ENV: 'production',
    PORT: '3000',
  },
  portMappings: [{
    containerPort: 3000,
    protocol: ecs.Protocol.TCP,
  }],
});

// Security group for app
const appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
  vpc,
  description: 'Security group for app container',
  allowAllOutbound: true,
});

// Allow HTTP from ALB
appSecurityGroup.addIngressRule(
  ec2.Peer.ipv4('10.0.0.0/16'), // VPC CIDR (adjust as needed)
  ec2.Port.tcp(3000),
  'Allow HTTP from ALB'
);

// Application Load Balancer
const alb = new elbv2.ApplicationLoadBalancer(this, 'AppLoadBalancer', {
  vpc,
  internetFacing: true,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PUBLIC,
  },
});

// Target group
const targetGroup = new elbv2.ApplicationTargetGroup(this, 'AppTargetGroup', {
  vpc,
  port: 3000,
  protocol: elbv2.ApplicationProtocol.HTTP,
  targetType: elbv2.TargetType.IP,
  healthCheck: {
    path: '/api/health',
    interval: cdk.Duration.seconds(30),
    timeout: cdk.Duration.seconds(5),
    healthyHttpCodes: '200',
  },
});

// Listener
alb.addListener('AppListener', {
  port: 80,
  protocol: elbv2.ApplicationProtocol.HTTP,
  defaultTargetGroups: [targetGroup],
});

// ECS Service
const appService = new ecs.FargateService(this, 'AppService', {
  cluster,
  taskDefinition: appTaskDef,
  desiredCount: 1, // Start with 1, can scale up
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE,
  },
  securityGroups: [appSecurityGroup],
  assignPublicIp: false,
});

// Attach service to target group
appService.attachToApplicationTargetGroup(targetGroup);

// Auto-scaling
const scaling = appService.autoScaleTaskCount({
  minCapacity: 1,
  maxCapacity: 10,
});

scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 70,
});

scaling.scaleOnMemoryUtilization('MemoryScaling', {
  targetUtilizationPercent: 80,
});

// Outputs
new cdk.CfnOutput(this, 'AppLoadBalancerUrl', {
  value: `http://${alb.loadBalancerDnsName}`,
  description: 'Application Load Balancer URL',
  exportName: 'PodcastPlatformAppUrl',
});

new cdk.CfnOutput(this, 'AppRepoUri', {
  value: appRepo.repositoryUri,
  description: 'ECR Repository URI for app',
  exportName: 'PodcastPlatformAppRepoUri',
});
```

### **Step 5: Build Script**

Create `scripts/build-and-push-app-container.ps1`:

```powershell
# Build and push single app container
Write-Host "🐳 Building and pushing app container..." -ForegroundColor Cyan

$accountId = aws sts get-caller-identity --query Account --output text
$region = "us-east-1"
$repoName = "podcast-platform-app"
$ecrUri = "$accountId.dkr.ecr.$region.amazonaws.com"

# Check/create ECR repository
$repoExists = aws ecr describe-repositories --repository-names $repoName --region $region 2>$null
if (-not $repoExists) {
    Write-Host "Creating ECR repository: $repoName" -ForegroundColor Yellow
    aws ecr create-repository --repository-name $repoName --region $region
}

# Login to ECR
Write-Host "`n🔐 Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $ecrUri

# Build Docker image
Write-Host "`n🔨 Building Docker image..." -ForegroundColor Yellow
docker build -f Dockerfile -t $repoName .

# Tag image
Write-Host "`n🏷️  Tagging image..." -ForegroundColor Yellow
$imageTag = "$ecrUri/$repoName:latest"
docker tag $repoName`:latest $imageTag

# Push image
Write-Host "`n📤 Pushing image to ECR..." -ForegroundColor Yellow
docker push $imageTag

Write-Host "`n🎉 Done! Your container is ready." -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Deploy infrastructure: npm run deploy" -ForegroundColor White
Write-Host "2. Access app at: http://<load-balancer-url>" -ForegroundColor White
```

### **Step 6: Update package.json**

Add start script if not exists:

```json
{
  "scripts": {
    "start": "next start",
    "build": "next build"
  }
}
```

---

## Deployment

### **Step 1: Build and Push**

```powershell
.\scripts\build-and-push-app-container.ps1
```

### **Step 2: Deploy Infrastructure**

```powershell
npm run deploy
```

### **Step 3: Access Application**

Get the Load Balancer URL from CDK outputs:
```powershell
aws cloudformation describe-stacks \
  --stack-name PodcastPlatformStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' \
  --output text
```

---

## Configuration

### **Environment Variables**

Set these in the CDK task definition or via Secrets Manager:

```bash
# AWS
AWS_REGION=us-east-1
PODCASTS_TABLE=podcasts
RUNS_TABLE=runs
# ... (all table names)

# Cognito
USER_POOL_ID=us-east-1_xxx
USER_POOL_CLIENT_ID=xxx

# OpenAI (from Secrets Manager)
OPENAI_API_KEY=sk-xxx

# App
NODE_ENV=production
PORT=3000
```

### **Secrets Manager Integration**

Update CDK to read from Secrets Manager:

```typescript
const openaiSecret = secretsmanager.Secret.fromSecretNameV2(
  this,
  'OpenAISecret',
  'podcast-platform/openai-key'
);

appTaskDef.addContainer('app', {
  // ... existing config
  secrets: {
    OPENAI_API_KEY: ecs.Secret.fromSecretsManager(openaiSecret, 'apiKey'),
  },
});
```

---

## Scaling

### **Auto-Scaling Configuration**

The CDK code above includes auto-scaling:
- **Min**: 1 container
- **Max**: 10 containers
- **CPU**: Scale at 70% utilization
- **Memory**: Scale at 80% utilization

### **Manual Scaling**

```bash
aws ecs update-service \
  --cluster podcast-platform-cluster \
  --service podcast-platform-app-service \
  --desired-count 3
```

---

## Cost Estimate

### **Single Container (Always Running)**
```
ECS Fargate (2 vCPU, 4GB):  ~$60/month (24/7)
Application Load Balancer:  ~$20/month
Data Transfer:              ~$10/month
─────────────────────────────────────
Total:                      ~$90/month
```

### **Comparison with Current Setup**
```
Current (Lambda + Static):  ~$70/month
Single Container:           ~$90/month
─────────────────────────────────────
Difference:                 +$20/month (29% more)
```

**Trade-off**: Simpler management vs slightly higher cost

---

## Pros & Cons Summary

### ✅ **When to Use Single Container:**
- ✅ Want simplest deployment
- ✅ Small to medium traffic
- ✅ Development/staging environment
- ✅ Cost not primary concern
- ✅ Want everything in one place

### ❌ **When NOT to Use:**
- ❌ Very high traffic (need separate scaling)
- ❌ Cost-sensitive
- ❌ Need to scale frontend/backend separately
- ❌ Want serverless benefits (pay per request)

---

## Migration Path

### **Option 1: Start with Single Container** ⭐ **RECOMMENDED**
1. Deploy single container
2. Test everything works
3. Split later if needed

### **Option 2: Keep Current + Add Container**
1. Keep Lambda for APIs
2. Keep static frontend
3. Use container for long-running pipelines
4. Best of both worlds

---

## Quick Start

```powershell
# 1. Build container
.\scripts\build-and-push-app-container.ps1

# 2. Deploy
npm run deploy

# 3. Get URL
aws cloudformation describe-stacks --stack-name PodcastPlatformStack --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' --output text

# 4. Access
# Open URL in browser
```

---

## That's It!

**One container. One deployment. Everything works.** 🎉

**Benefits:**
- ✅ Simplest possible setup
- ✅ Easy to manage
- ✅ Fast development
- ✅ Same environment everywhere

**Trade-offs:**
- ⚠️ Slightly more expensive (~$20/month)
- ⚠️ Can't scale components separately
- ⚠️ Must redeploy for any change

**Recommendation**: Perfect for getting started! You can always split later if needed.

---

**Last Updated**: 2025-01-17  
**Status**: Ready to implement

