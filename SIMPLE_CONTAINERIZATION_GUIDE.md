# 🚀 Simple Containerization Guide - ECS Fargate

## Recommendation: **ECS Fargate** ⭐

**Why?**
- ✅ **Simplest** - No EC2 instances to manage
- ✅ **Already set up** - Your ECS cluster exists
- ✅ **Works with Step Functions** - Already configured
- ✅ **Auto-scaling** - Handles traffic automatically
- ✅ **Just works** - Deploy and forget

---

## Quick Start (3 Steps)

### **Step 1: Create ECR Repository**

```bash
# Create repository for scraper
aws ecr create-repository --repository-name podcast-scraper --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com
```

**Get your account ID:**
```bash
aws sts get-caller-identity --query Account --output text
```

### **Step 2: Build and Push Container**

```bash
# Navigate to project root
cd C:\Users\rohit.m.mangal\Cursor\company-intel-podcast

# Build the scraper image
docker build -f containers/scraper/Dockerfile -t podcast-scraper .

# Tag for ECR
docker tag podcast-scraper:latest <YOUR-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/podcast-scraper:latest

# Push to ECR
docker push <YOUR-ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/podcast-scraper:latest
```

### **Step 3: Update CDK Stack**

I'll create a simple CDK update that uses your ECR image.

---

## What Gets Containerized?

### **1. Scraper Service** (Priority 1)
- **Why**: Long-running, needs Playwright, already planned
- **Where**: ECS Fargate
- **Invoked by**: Step Functions

### **2. Pipeline Engine** (Optional)
- **Why**: If stages take > 15 minutes
- **Where**: ECS Fargate or keep as Lambda
- **Decision**: Start with Lambda, move to Fargate if needed

### **3. Frontend** (Keep Static)
- **Why**: Static export is simpler and faster
- **Where**: S3 + CloudFront (already working)
- **Change**: Only if you need SSR

---

## Simple CDK Update

Add this to your `infra/cdk/lib/podcast-platform-stack.ts`:

```typescript
// After the ECS cluster creation (around line 342)

// ========================================================================
// ECR Repository for Scraper
// ========================================================================

const scraperRepo = new ecr.Repository(this, 'ScraperRepo', {
  repositoryName: 'podcast-scraper',
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// ========================================================================
// ECS Task Definition for Scraper
// ========================================================================

const scraperTaskRole = new iam.Role(this, 'ScraperTaskRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  description: 'Role for scraper ECS tasks',
});

// Grant S3 access
mediaBucket.grantReadWrite(scraperTaskRole);
rssBucket.grantReadWrite(scraperTaskRole);

// Grant DynamoDB access
runsTable.grantReadWriteData(scraperTaskRole);
eventsTable.grantWriteData(scraperTaskRole);

// Grant Secrets Manager access (for OpenAI key)
scraperTaskRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['secretsmanager:GetSecretValue'],
  resources: ['*'], // Restrict to specific secret in production
}));

const scraperTaskDef = new ecs.FargateTaskDefinition(this, 'ScraperTaskDef', {
  memoryLimitMiB: 2048,  // 2GB
  cpu: 1024,              // 1 vCPU
  taskRole: scraperTaskRole,
});

scraperTaskDef.addContainer('scraper', {
  image: ecs.ContainerImage.fromEcrRepository(scraperRepo, 'latest'),
  logging: ecs.LogDrivers.awsLogs({
    streamPrefix: 'scraper',
    logGroup: new logs.LogGroup(this, 'ScraperLogGroup', {
      logGroupName: '/ecs/podcast-scraper',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    }),
  }),
  environment: {
    AWS_REGION: this.region,
    PODCASTS_TABLE: podcastsTable.tableName,
    RUNS_TABLE: runsTable.tableName,
    EVENTS_TABLE: eventsTable.tableName,
    MEDIA_BUCKET: mediaBucket.bucketName,
    RSS_BUCKET: rssBucket.bucketName,
    NODE_ENV: 'production',
  },
});

// Export task definition ARN for Step Functions
new cdk.CfnOutput(this, 'ScraperTaskDefinitionArn', {
  value: scraperTaskDef.taskDefinitionArn,
  description: 'Scraper ECS Task Definition ARN',
  exportName: 'PodcastPlatformScraperTaskDefArn',
});
```

---

## Update Step Functions

Your Step Functions already references `${ScrapeTaskDefinitionArn}` - just make sure it uses the exported value from CDK.

---

## Deployment Commands

```bash
# 1. Build and push container
docker build -f containers/scraper/Dockerfile -t podcast-scraper .
docker tag podcast-scraper:latest <ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/podcast-scraper:latest
docker push <ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/podcast-scraper:latest

# 2. Deploy infrastructure
npm run deploy

# 3. Test
# Trigger a pipeline run via your UI or Step Functions console
```

---

## What You Get

✅ **Serverless containers** - No infrastructure to manage  
✅ **Auto-scaling** - Handles traffic spikes  
✅ **Integrated logging** - CloudWatch Logs  
✅ **Security** - IAM roles, VPC isolation  
✅ **Cost-effective** - Pay only when running  
✅ **Simple** - Deploy and it works  

---

## Troubleshooting

### Container won't start?
```bash
# Check CloudWatch Logs
aws logs tail /ecs/podcast-scraper --follow
```

### Image not found?
```bash
# Verify image exists
aws ecr describe-images --repository-name podcast-scraper
```

### Task fails?
```bash
# Check ECS task logs
aws ecs describe-tasks --cluster podcast-platform-cluster --tasks <task-id>
```

---

## Next Steps

1. ✅ Create ECR repository
2. ✅ Build and push container
3. ✅ Update CDK stack (code above)
4. ✅ Deploy: `npm run deploy`
5. ✅ Test pipeline execution

**Estimated time**: 30-60 minutes

---

**That's it!** Simple, works, no infrastructure management. 🎉

