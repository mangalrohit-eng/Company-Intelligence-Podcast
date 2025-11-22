# 🎼 Containerizing the Pipeline Orchestrator

## Current Orchestration Architecture

You have **TWO orchestration approaches**:

### **1. Monolithic Orchestrator** (Current - Local/Next.js)
```
Next.js API Route → PipelineOrchestrator.execute()
                  → Runs all 13 stages in one process
                  → Saves to local filesystem
                  → Used for: Development, local testing
```

**Location**: `src/app/api/podcasts/[id]/runs/route.ts`  
**Code**: `src/engine/orchestrator.ts`  
**Status**: ✅ Working, runs locally via Next.js

### **2. Distributed Orchestrator** (Production - Step Functions)
```
Step Functions → Invoke individual stage Lambdas/ECS tasks
               → Each stage runs separately
               → Handles retries, parallel execution
               → Used for: Production, AWS deployment
```

**Location**: `infra/stepfunctions/podcast_pipeline.asl.json`  
**Status**: ✅ Deployed, ready to use

---

## Why Containerize the Orchestrator?

### **Current Issues:**
1. **Tied to Next.js** - Can't run standalone
2. **Local filesystem** - Writes to `output/` directory
3. **No time limits** - Could run for hours (Lambda timeout is 15 min)
4. **Resource limits** - Next.js server may not have enough memory/CPU
5. **Scaling** - Can't scale orchestrator independently

### **Benefits of Containerization:**
✅ **Standalone execution** - Run without Next.js  
✅ **Better resource control** - Allocate CPU/memory as needed  
✅ **No time limits** - Can run for hours if needed  
✅ **Scalable** - Run multiple orchestrations in parallel  
✅ **Isolated** - Won't affect Next.js server  
✅ **Works with Step Functions** - Can be invoked as ECS task  

---

## Containerization Options

### **Option 1: ECS Fargate** ⭐ **RECOMMENDED**

**Best for:** Long-running orchestrations, production workloads

#### **Architecture:**
```
Step Functions / API Gateway
         ↓
    ECS Fargate Task
         ↓
PipelineOrchestrator.execute()
         ↓
    All 13 stages run in sequence
         ↓
    Results → S3 + DynamoDB
```

#### **Pros:**
- ✅ No time limits (can run for hours)
- ✅ Better resource allocation (CPU/memory)
- ✅ Works with Step Functions
- ✅ Auto-scaling
- ✅ Isolated from Next.js

#### **Cons:**
- ⚠️ More expensive than Lambda (~$0.05/hour)
- ⚠️ Cold starts (~10-30 seconds)

#### **When to use:**
- Full pipeline takes > 15 minutes
- Need better resource control
- Want to run orchestrator standalone
- Production workloads

---

### **Option 2: Keep as Lambda** (Current - If < 15 min)

**Best for:** Short orchestrations, cost optimization

#### **Pros:**
- ✅ Cheaper (pay per invocation)
- ✅ Faster cold starts (~100ms)
- ✅ Serverless (no infrastructure)

#### **Cons:**
- ❌ 15-minute max execution time
- ❌ Limited memory (10GB max)
- ❌ Tied to Next.js API route

#### **When to use:**
- Pipeline completes in < 15 minutes
- Cost is a concern
- Current setup works fine

---

### **Option 3: Hybrid Approach** ⭐ **BEST OF BOTH WORLDS**

**Use both:**
- **Lambda** for short orchestrations (< 15 min)
- **ECS Fargate** for long orchestrations (> 15 min)

**Decision logic:**
```typescript
if (estimatedDuration < 15 minutes) {
  // Use Lambda (via Next.js API route)
} else {
  // Use ECS Fargate (via Step Functions)
}
```

---

## Implementation: Containerize Orchestrator

### **Step 1: Create Standalone Entry Point**

Create `containers/orchestrator/index.ts`:

```typescript
#!/usr/bin/env node
/**
 * Standalone Pipeline Orchestrator Entry Point
 * Can be run in a container without Next.js
 */

import { PipelineOrchestrator } from '../../src/engine/orchestrator';
import { RealtimeEventEmitter } from '../../src/utils/realtime-event-emitter';
import { logger } from '../../src/utils/logger';

async function main() {
  // Get input from environment variables or stdin
  const runId = process.env.RUN_ID || `run-${Date.now()}`;
  const podcastId = process.env.PODCAST_ID || 'default-podcast';
  
  // Parse input from environment or file
  const inputJson = process.env.PIPELINE_INPUT || process.stdin.read()?.toString();
  if (!inputJson) {
    throw new Error('PIPELINE_INPUT environment variable or stdin required');
  }
  
  const pipelineInput = JSON.parse(inputJson);
  
  logger.info('Starting standalone orchestrator', { runId, podcastId });
  
  // Create event emitter that writes to CloudWatch/DynamoDB
  const emitter = new RealtimeEventEmitter(async (update) => {
    // Write events to DynamoDB run_events table
    // (instead of local filesystem)
    logger.info('Pipeline event', update);
    
    // TODO: Write to DynamoDB run_events table
    // await writeEventToDynamoDB(runId, update);
  });
  
  // Create orchestrator
  const orchestrator = new PipelineOrchestrator();
  
  // Execute pipeline
  try {
    const output = await orchestrator.execute(pipelineInput, emitter);
    logger.info('Pipeline completed', { 
      runId, 
      status: output.status,
      episodeId: output.episodeId 
    });
    
    // Write output to S3 (instead of local filesystem)
    // TODO: Upload artifacts to S3
    
    process.exit(output.status === 'success' ? 0 : 1);
  } catch (error) {
    logger.error('Pipeline failed', { runId, error });
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Fatal error', error);
  process.exit(1);
});
```

### **Step 2: Update Dockerfile**

Update `containers/pipeline/Dockerfile`:

```dockerfile
# Pipeline Orchestrator Dockerfile
# Standalone orchestrator that runs all pipeline stages

FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./

# Install dependencies
RUN npm ci --production

# Copy source code
COPY src/ ./src/
COPY containers/orchestrator/ ./containers/orchestrator/

# Build TypeScript
RUN npm run build || true  # Build if build script exists

# Set environment variables
ENV NODE_ENV=production

# Run orchestrator
CMD ["node", "--loader", "tsx/esm", "containers/orchestrator/index.ts"]
```

### **Step 3: Update CDK Stack**

Add orchestrator task definition to `infra/cdk/lib/podcast-platform-stack.ts`:

```typescript
// After scraper task definition

// ECR Repository for orchestrator
const orchestratorRepo = new ecr.Repository(this, 'OrchestratorRepo', {
  repositoryName: 'podcast-orchestrator',
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// IAM role for orchestrator tasks
const orchestratorTaskRole = new iam.Role(this, 'OrchestratorTaskRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  description: 'Role for orchestrator ECS tasks',
});

// Grant all necessary permissions
mediaBucket.grantReadWrite(orchestratorTaskRole);
rssBucket.grantReadWrite(orchestratorTaskRole);
runsTable.grantReadWriteData(orchestratorTaskRole);
eventsTable.grantWriteData(orchestratorTaskRole);
episodesTable.grantWriteData(orchestratorTaskRole);
podcastsTable.grantReadData(orchestratorTaskRole);

// Grant Secrets Manager access
orchestratorTaskRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['secretsmanager:GetSecretValue'],
  resources: ['*'],
}));

// Fargate task definition for orchestrator
const orchestratorTaskDef = new ecs.FargateTaskDefinition(this, 'OrchestratorTaskDef', {
  memoryLimitMiB: 4096,  // 4GB (more than scraper)
  cpu: 2048,              // 2 vCPU
  taskRole: orchestratorTaskRole,
});

orchestratorTaskDef.addContainer('orchestrator', {
  image: ecs.ContainerImage.fromEcrRepository(orchestratorRepo, 'latest'),
  logging: ecs.LogDrivers.awsLogs({
    streamPrefix: 'orchestrator',
    logGroup: new logs.LogGroup(this, 'OrchestratorLogGroup', {
      logGroupName: '/ecs/podcast-orchestrator',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    }),
  }),
  environment: {
    AWS_REGION: this.region,
    PODCASTS_TABLE: podcastsTable.tableName,
    RUNS_TABLE: runsTable.tableName,
    EVENTS_TABLE: eventsTable.tableName,
    EPISODES_TABLE: episodesTable.tableName,
    MEDIA_BUCKET: mediaBucket.bucketName,
    RSS_BUCKET: rssBucket.bucketName,
    NODE_ENV: 'production',
  },
});

// Export for Step Functions
new cdk.CfnOutput(this, 'OrchestratorTaskDefinitionArn', {
  value: orchestratorTaskDef.taskDefinitionArn,
  description: 'Orchestrator ECS Task Definition ARN',
  exportName: 'PodcastPlatformOrchestratorTaskDefArn',
});
```

### **Step 4: Update Step Functions**

Update `infra/stepfunctions/podcast_pipeline.asl.json` to use orchestrator container:

```json
{
  "Comment": "AI Podcast Generation Pipeline",
  "StartAt": "CheckOrchestrationMode",
  "States": {
    "CheckOrchestrationMode": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.flags.useMonolithicOrchestrator",
          "BooleanEquals": true,
          "Next": "RunMonolithicOrchestrator"
        }
      ],
      "Default": "Prepare"
    },
    "RunMonolithicOrchestrator": {
      "Type": "Task",
      "Resource": "arn:aws:states:::ecs:runTask.sync",
      "Parameters": {
        "Cluster": "${EcsClusterArn}",
        "TaskDefinition": "${OrchestratorTaskDefinitionArn}",
        "LaunchType": "FARGATE",
        "NetworkConfiguration": {
          "AwsvpcConfiguration": {
            "Subnets": ["${SubnetId}"],
            "SecurityGroups": ["${SecurityGroupId}"],
            "AssignPublicIp": "DISABLED"
          }
        },
        "Overrides": {
          "ContainerOverrides": [
            {
              "Name": "orchestrator",
              "Environment": [
                {
                  "Name": "RUN_ID",
                  "Value.$": "$.runId"
                },
                {
                  "Name": "PODCAST_ID",
                  "Value.$": "$.podcastId"
                },
                {
                  "Name": "PIPELINE_INPUT",
                  "Value.$": "States.JsonToString($)"
                }
              ]
            }
          ]
        }
      },
      "End": true
    },
    "Prepare": {
      // ... existing stage definitions
    }
  }
}
```

---

## Usage Examples

### **Option A: Run via Step Functions**

```bash
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:098478926952:stateMachine:podcast-pipeline \
  --input '{
    "runId": "run-001",
    "podcastId": "podcast-001",
    "config": { ... },
    "flags": {
      "useMonolithicOrchestrator": true,
      "enable": { ... }
    }
  }'
```

### **Option B: Run via API (Next.js Route)**

Update `src/app/api/podcasts/[id]/runs/route.ts`:

```typescript
// Check if should use containerized orchestrator
const useContainerized = process.env.USE_CONTAINERIZED_ORCHESTRATOR === 'true' 
  || estimatedDuration > 15 * 60 * 1000; // > 15 minutes

if (useContainerized) {
  // Invoke ECS Fargate task via Step Functions
  await stepFunctionsClient.startExecution({
    stateMachineArn: process.env.STATE_MACHINE_ARN!,
    input: JSON.stringify({
      runId,
      podcastId,
      config: pipelineInput.config,
      flags: { ...pipelineInput.flags, useMonolithicOrchestrator: true }
    })
  });
} else {
  // Run locally (current implementation)
  await executePipeline(runId, podcastId, run, podcast);
}
```

### **Option C: Run Standalone (CLI)**

```bash
# Build and push container
docker build -f containers/pipeline/Dockerfile -t podcast-orchestrator .
docker tag podcast-orchestrator:latest <ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/podcast-orchestrator:latest
docker push <ACCOUNT-ID>.dkr.ecr.us-east-1.amazonaws.com/podcast-orchestrator:latest

# Run locally (for testing)
docker run --rm \
  -e RUN_ID=run-test-001 \
  -e PODCAST_ID=podcast-001 \
  -e PIPELINE_INPUT='{"runId":"run-test-001",...}' \
  -e AWS_REGION=us-east-1 \
  -v ~/.aws:/root/.aws:ro \
  podcast-orchestrator
```

---

## Comparison: Monolithic vs Distributed

| Aspect | Monolithic (Container) | Distributed (Step Functions) |
|--------|----------------------|------------------------------|
| **Execution Time** | No limit | 15 min per stage (Lambda) |
| **Resource Control** | Full control (CPU/memory) | Per-stage limits |
| **Cost** | ~$0.05/hour | ~$0.20 per execution |
| **Complexity** | Simpler (one process) | More complex (orchestration) |
| **Debugging** | Easier (single log) | Harder (multiple logs) |
| **Scaling** | Manual (task count) | Automatic (per stage) |
| **Retries** | Manual handling | Built-in (Step Functions) |
| **Parallel Stages** | Sequential only | Can run in parallel |

---

## Recommendation

### **Use Monolithic Orchestrator (Container) When:**
- ✅ Pipeline takes > 15 minutes total
- ✅ Need better resource control
- ✅ Want simpler debugging
- ✅ Running locally or in development

### **Use Distributed Orchestrator (Step Functions) When:**
- ✅ Pipeline stages are independent
- ✅ Want automatic retries
- ✅ Need parallel execution
- ✅ Production workloads with high reliability

### **Best Practice: Support Both**
- Allow switching via flag: `useMonolithicOrchestrator`
- Default to distributed (more reliable)
- Use monolithic for long-running or development

---

## Quick Start

1. **Create entry point**: `containers/orchestrator/index.ts`
2. **Update Dockerfile**: `containers/pipeline/Dockerfile`
3. **Update CDK**: Add orchestrator task definition
4. **Build & push**: `.\scripts\build-and-push-container.ps1` (update for orchestrator)
5. **Deploy**: `npm run deploy`
6. **Test**: Invoke via Step Functions or API

**Estimated time**: 2-3 hours

---

**Last Updated**: 2025-01-17  
**Status**: Ready to implement

