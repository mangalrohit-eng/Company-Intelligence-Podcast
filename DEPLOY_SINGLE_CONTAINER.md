# 🚀 Deploy Single Container to AWS - Step by Step

## Prerequisites

- ✅ AWS CLI configured
- ✅ Docker installed and running
- ✅ Node.js 18+ installed
- ✅ npm dependencies installed

---

## Step 1: Build and Push Container (10-15 minutes)

```powershell
# Run the build script
.\scripts\build-and-push-app-container.ps1
```

**What this does:**
- Creates ECR repository (if needed)
- Builds Docker image (~5-10 minutes)
- Pushes to AWS ECR (~2-5 minutes)

**Expected output:**
```
✅ Account ID: 098478926952
✅ Repository exists
✅ Logged in
✅ Image built
✅ Tagged as ...
✅ Image pushed successfully!
```

---

## Step 2: Deploy Infrastructure (15-20 minutes)

```powershell
# Deploy CDK stack
npm run deploy
```

**What this creates:**
- ECR repository for app
- ECS Fargate task definition
- Application Load Balancer
- ECS Service (1 container initially)
- Auto-scaling configuration
- Security groups
- IAM roles

**Expected output:**
```
✨  Synthesis time: 5.2s

PodcastPlatformStack: deploying...
...
 ✅  PodcastPlatformStack

✨  Deployment time: 652.18s

Outputs:
PodcastPlatformStack.AppLoadBalancerUrl = http://podcast-platform-app-loadbalancer-xxx.us-east-1.elb.amazonaws.com
PodcastPlatformStack.AppRepoUri = 098478926952.dkr.ecr.us-east-1.amazonaws.com/podcast-platform-app
```

---

## Step 3: Get Your Application URL

After deployment, get the Load Balancer URL:

```powershell
# Get URL from CDK outputs
aws cloudformation describe-stacks `
  --stack-name PodcastPlatformStack `
  --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' `
  --output text
```

Or check the CDK output in the terminal.

---

## Step 4: Access Your Application

1. **Open the Load Balancer URL** in your browser
2. **Wait 1-2 minutes** for the container to start (first time)
3. **Check health endpoint**: `http://<alb-url>/api/health`
4. **Access the app**: `http://<alb-url>/`

---

## Step 5: Configure Environment Variables (If Needed)

If you need to set OpenAI API key or other secrets:

### Option A: Via Secrets Manager

```powershell
# Create secret
aws secretsmanager create-secret `
  --name podcast-platform/openai-key `
  --secret-string '{"apiKey":"sk-proj-your-key-here"}'

# Update CDK to use secret (add to appTaskDef secrets)
```

### Option B: Via CDK Environment Variables

Update `infra/cdk/lib/podcast-platform-stack.ts`:

```typescript
environment: {
  // ... existing vars
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '', // From local env
},
```

Then redeploy:
```powershell
npm run deploy
```

---

## Troubleshooting

### Container Won't Start

**Check ECS Service:**
```powershell
aws ecs describe-services `
  --cluster podcast-platform-cluster `
  --services podcast-platform-app-service `
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount}'
```

**Check Logs:**
```powershell
aws logs tail /ecs/podcast-platform-app --follow
```

**Check Task Status:**
```powershell
aws ecs list-tasks --cluster podcast-platform-cluster --service-name podcast-platform-app-service
```

### Health Check Failing

**Check if health endpoint works:**
```powershell
curl http://<alb-url>/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-17T...",
  "service": "podcast-platform"
}
```

### Container Keeps Restarting

**Check logs for errors:**
```powershell
aws logs tail /ecs/podcast-platform-app --follow
```

**Common issues:**
- Missing environment variables
- Database connection errors
- Port conflicts

### Can't Access Application

**Check Load Balancer:**
```powershell
aws elbv2 describe-load-balancers `
  --query 'LoadBalancers[?contains(LoadBalancerName, `podcast-platform`)].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}'
```

**Check Security Groups:**
- ALB should allow inbound HTTP (port 80)
- App security group should allow from ALB

---

## Verify Deployment

### 1. Check ECS Service
```powershell
aws ecs describe-services `
  --cluster podcast-platform-cluster `
  --services podcast-platform-app-service
```

**Should show:**
- `status`: ACTIVE
- `runningCount`: 1
- `desiredCount`: 1

### 2. Check Load Balancer
```powershell
aws elbv2 describe-load-balancers `
  --query 'LoadBalancers[?contains(LoadBalancerName, `podcast-platform`)].DNSName' `
  --output text
```

### 3. Test Health Endpoint
```powershell
curl http://<alb-url>/api/health
```

### 4. Test Frontend
Open `http://<alb-url>/` in browser

---

## Scaling

### Manual Scaling

```powershell
aws ecs update-service `
  --cluster podcast-platform-cluster `
  --service podcast-platform-app-service `
  --desired-count 3
```

### Auto-Scaling

Already configured! The service will:
- Scale up when CPU > 70% or Memory > 80%
- Scale down when resources are available
- Min: 1 container
- Max: 10 containers

---

## Update Deployment

When you make code changes:

```powershell
# 1. Rebuild and push container
.\scripts\build-and-push-app-container.ps1

# 2. Force new deployment (ECS will pull new image)
aws ecs update-service `
  --cluster podcast-platform-cluster `
  --service podcast-platform-app-service `
  --force-new-deployment
```

---

## Cost Estimate

**Monthly costs (1 container running 24/7):**
- ECS Fargate (2 vCPU, 4GB): ~$60/month
- Application Load Balancer: ~$20/month
- Data Transfer: ~$10/month
- **Total: ~$90/month**

**Plus existing costs:**
- DynamoDB: ~$5/month
- S3: ~$5/month
- Other services: ~$10/month

**Grand Total: ~$110/month**

---

## Next Steps

1. ✅ **Test the application** - Access via Load Balancer URL
2. ✅ **Configure domain** (optional) - Point your domain to ALB
3. ✅ **Set up HTTPS** (optional) - Add SSL certificate to ALB
4. ✅ **Monitor** - Check CloudWatch logs and metrics
5. ✅ **Scale** - Adjust desired count based on traffic

---

## Quick Commands Reference

```powershell
# Build and push
.\scripts\build-and-push-app-container.ps1

# Deploy
npm run deploy

# Get URL
aws cloudformation describe-stacks --stack-name PodcastPlatformStack --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' --output text

# Check logs
aws logs tail /ecs/podcast-platform-app --follow

# Scale
aws ecs update-service --cluster podcast-platform-cluster --service podcast-platform-app-service --desired-count 2

# Force new deployment
aws ecs update-service --cluster podcast-platform-cluster --service podcast-platform-app-service --force-new-deployment
```

---

**That's it! Your single container is now deployed to AWS! 🎉**

