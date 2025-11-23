# ECS Deployment Guide

## Current Status

✅ **CDK Stack**: Deployed (`UPDATE_COMPLETE`)  
✅ **ECS Service**: Created and running  
❌ **Docker Image**: Not in ECR yet  

## What You Need to Do

### Step 1: Build and Push Docker Image to ECR

You have two options:

#### Option A: Local Docker (If Docker is available)

```powershell
# Run the build script
.\scripts\build-and-push-app-container.ps1
```

This will:
1. Check Docker is installed and running
2. Build the Docker image
3. Push it to ECR (`podcast-platform-app` repository)

**Time:** ~10-15 minutes (first time, includes Playwright installation)

#### Option B: AWS CodeBuild (If Docker is blocked locally)

```powershell
# Setup CodeBuild (one-time)
.\scripts\setup-codebuild.ps1

# Prepare and upload source
.\scripts\prepare-codebuild-source.ps1

# Trigger build
.\scripts\trigger-codebuild.ps1
```

**Time:** ~15-20 minutes

---

### Step 2: Force ECS Service to Pull New Image

After the image is pushed to ECR, force ECS to deploy it:

```powershell
# Force new deployment (pulls latest image)
aws ecs update-service `
  --cluster podcast-platform-cluster `
  --service PodcastPlatformStack-AppServiceA2F9036C-TpzovQqVYntg `
  --force-new-deployment `
  --region us-east-1
```

**Time:** ~3-5 minutes for containers to restart

---

### Step 3: Get Your Load Balancer URL

```powershell
# Get the Load Balancer URL
aws cloudformation describe-stacks `
  --stack-name PodcastPlatformStack `
  --region us-east-1 `
  --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' `
  --output text
```

Or check CDK outputs:
```powershell
cd infra/cdk
cdk deploy --outputs-file outputs.json
cat outputs.json | grep AppLoadBalancerUrl
```

---

### Step 4: Access Your Application

1. **Open the Load Balancer URL** in your browser
2. **Wait 2-3 minutes** for containers to start (first deployment)
3. **Check health endpoint**: `http://<alb-url>/api/health`
   - Should return: `{"status":"ok"}`

---

## Monitor Deployment

### Check ECS Service Status

```powershell
aws ecs describe-services `
  --cluster podcast-platform-cluster `
  --services PodcastPlatformStack-AppServiceA2F9036C-TpzovQqVYntg `
  --region us-east-1 `
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Deployments:deployments[*].{Status:status,Running:runningCount}}'
```

### Check Container Logs

```powershell
aws logs tail /ecs/podcast-platform-app --region us-east-1 --since 10m --follow
```

### Check Task Status

```powershell
# List tasks
aws ecs list-tasks --cluster podcast-platform-cluster --service-name PodcastPlatformStack-AppServiceA2F9036C-TpzovQqVYntg --region us-east-1

# Describe a task (replace TASK_ARN)
aws ecs describe-tasks --cluster podcast-platform-cluster --tasks <TASK_ARN> --region us-east-1
```

---

## What's Already Configured

✅ **ECS Cluster**: `podcast-platform-cluster`  
✅ **Task Definition**: Configured with:
   - 4GB memory, 2 vCPU
   - All environment variables (including the 3 we just added)
   - Secrets Manager integration (OpenAI API key)
   - CloudWatch logging

✅ **ECS Service**: 
   - Running 1 task
   - Auto-scaling configured (1-10 tasks)
   - Health checks enabled

✅ **Load Balancer**: Application Load Balancer configured  
✅ **Networking**: VPC, subnets, security groups configured  

---

## Troubleshooting

### If containers don't start:

1. **Check task logs:**
   ```powershell
   aws logs tail /ecs/podcast-platform-app --region us-east-1 --since 30m
   ```

2. **Check task status:**
   ```powershell
   aws ecs describe-tasks --cluster podcast-platform-cluster --tasks <TASK_ARN> --region us-east-1 --query 'tasks[0].{LastStatus:lastStatus,StoppedReason:stoppedReason,Containers:containers[*].{Name:name,LastStatus:lastStatus,Reason:reason}}'
   ```

3. **Verify image exists:**
   ```powershell
   aws ecr describe-images --repository-name podcast-platform-app --region us-east-1
   ```

### If health checks fail:

1. **Check if port 3000 is accessible:**
   - Security group should allow traffic from ALB
   - Container should be listening on port 3000

2. **Check health endpoint:**
   ```powershell
   curl http://<alb-url>/api/health
   ```

### If Load Balancer shows unhealthy:

1. **Check target group health:**
   ```powershell
   # Get target group ARN
   aws elbv2 describe-target-groups --region us-east-1 --query 'TargetGroups[?contains(TargetGroupName, `AppTarget`)].TargetGroupArn' --output text
   
   # Check health
   aws elbv2 describe-target-health --target-group-arn <TARGET_GROUP_ARN> --region us-east-1
   ```

---

## Quick Start Commands

```powershell
# 1. Build and push image
.\scripts\build-and-push-app-container.ps1

# 2. Force ECS deployment
aws ecs update-service --cluster podcast-platform-cluster --service PodcastPlatformStack-AppServiceA2F9036C-TpzovQqVYntg --force-new-deployment --region us-east-1

# 3. Get Load Balancer URL
aws cloudformation describe-stacks --stack-name PodcastPlatformStack --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' --output text

# 4. Monitor logs
aws logs tail /ecs/podcast-platform-app --region us-east-1 --follow
```

---

## Next Steps After Deployment

1. ✅ Test the application at Load Balancer URL
2. ✅ Verify episodes are showing (with the fixes we made)
3. ✅ Monitor CloudWatch logs for any errors
4. ✅ Check ECS service metrics in AWS Console

