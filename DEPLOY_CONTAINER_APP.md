# 🚀 Deploy Containerized Application to AWS

Your Docker image has been successfully built and pushed to ECR! Now let's deploy it to ECS Fargate so you can access your application.

## Current Status

✅ **Docker Image**: Built and pushed to ECR  
✅ **CDK Stack**: Deployed (but ECS service not included yet)  
⏳ **ECS Service**: Needs to be deployed

---

## Step 1: Update CDK Stack to Deploy ECS Service

The CDK code already includes the ECS Fargate service and Application Load Balancer, but they need to be deployed.

```powershell
# Navigate to project root
cd C:\Users\rohit.m.mangal\Cursor\company-intel-podcast

# Deploy/update the CDK stack (this will add ECS service and ALB)
npm run deploy
```

**Expected output:**
```
✨  Synthesis time: 5.2s

PodcastPlatformStack: deploying...
...
 ✅  PodcastPlatformStack

✨  Deployment time: 10-15 minutes

Outputs:
PodcastPlatformStack.AppLoadBalancerUrl = http://podcast-platform-app-loadbalancer-xxx.us-east-1.elb.amazonaws.com
PodcastPlatformStack.AppRepoUri = 098478926952.dkr.ecr.us-east-1.amazonaws.com/podcast-platform-app
```

---

## Step 2: Get Your Application URL

After deployment completes, get the Load Balancer URL:

```powershell
# Get the Load Balancer URL
aws cloudformation describe-stacks `
  --stack-name PodcastPlatformStack `
  --region us-east-1 `
  --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' `
  --output text
```

Or check the CDK output in the terminal after deployment.

---

## Step 3: Access Your Application

1. **Open the Load Balancer URL** in your browser
   - Example: `http://podcast-platform-app-loadbalancer-xxx.us-east-1.elb.amazonaws.com`

2. **Wait 2-3 minutes** for the container to start (first time deployment)
   - The ECS service needs to:
     - Pull the Docker image from ECR
     - Start the container
     - Pass health checks

3. **Check health endpoint**:
   ```
   http://<alb-url>/api/health
   ```
   Should return: `{"status":"ok"}`

4. **Access the app**:
   ```
   http://<alb-url>/
   ```

---

## Step 4: Monitor Deployment

### Check ECS Service Status

```powershell
# List ECS services
aws ecs list-services --cluster podcast-platform-cluster --region us-east-1

# Check service status
aws ecs describe-services `
  --cluster podcast-platform-cluster `
  --services podcast-platform-cluster-AppService `
  --region us-east-1 `
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
```

### Check Container Logs

```powershell
# View recent logs
aws logs tail /ecs/podcast-platform-app --region us-east-1 --since 10m
```

### Check Task Status

```powershell
# List running tasks
aws ecs list-tasks --cluster podcast-platform-cluster --region us-east-1

# Describe a task
aws ecs describe-tasks `
  --cluster podcast-platform-cluster `
  --tasks <task-arn> `
  --region us-east-1
```

---

## Step 5: Troubleshooting

### If the app doesn't load:

1. **Check ECS service is running**:
   ```powershell
   aws ecs describe-services --cluster podcast-platform-cluster --services podcast-platform-cluster-AppService --region us-east-1
   ```
   - `desiredCount` should be 1
   - `runningCount` should be 1

2. **Check container logs for errors**:
   ```powershell
   aws logs tail /ecs/podcast-platform-app --region us-east-1 --since 30m
   ```

3. **Check Load Balancer target health**:
   ```powershell
   # Get target group ARN
   aws elbv2 describe-target-groups --region us-east-1 --query 'TargetGroups[?contains(TargetGroupName, `AppTarget`)].TargetGroupArn' --output text
   
   # Check target health
   aws elbv2 describe-target-health --target-group-arn <target-group-arn> --region us-east-1
   ```

4. **Verify Docker image exists in ECR**:
   ```powershell
   aws ecr describe-images --repository-name podcast-platform-app --region us-east-1
   ```

---

## What Gets Deployed

The CDK stack will create/update:

- ✅ **ECS Fargate Service**: Runs your containerized Next.js app
- ✅ **Application Load Balancer**: Public-facing URL for your app
- ✅ **Target Group**: Routes traffic to ECS tasks
- ✅ **Security Groups**: Network access rules
- ✅ **Auto-scaling**: Scales based on CPU/memory usage
- ✅ **CloudWatch Logs**: Container logs

---

## Environment Variables

The ECS task automatically gets these environment variables:
- `AWS_REGION`: us-east-1
- `NODE_ENV`: production
- `PORT`: 3000
- DynamoDB table names
- S3 bucket names
- Cognito User Pool IDs

**Note**: If you need to add custom environment variables (like `OPENAI_API_KEY`), you'll need to:
1. Store them in AWS Secrets Manager or Parameter Store
2. Update the CDK stack to reference them
3. Redeploy

---

## Next Steps After Deployment

1. **Set up a custom domain** (optional):
   - Use Route 53 or another DNS provider
   - Point to the Load Balancer

2. **Enable HTTPS** (recommended):
   - Request an ACM certificate
   - Update ALB listener to use HTTPS (port 443)

3. **Configure auto-scaling**:
   - Already configured: 1-10 tasks
   - Adjust based on your needs

4. **Set up monitoring**:
   - CloudWatch dashboards
   - Alarms for errors/high latency

---

## Cost Estimate

**ECS Fargate** (1 task, 2 vCPU, 4GB RAM):
- ~$0.04/hour = ~$30/month (if running 24/7)
- Can scale down to 0 when not in use

**Application Load Balancer**:
- ~$0.0225/hour = ~$16/month

**Total**: ~$46/month base cost

---

## Quick Access Commands

```powershell
# Get app URL
$url = aws cloudformation describe-stacks --stack-name PodcastPlatformStack --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' --output text
Write-Host "App URL: $url"

# Open in browser (Windows)
Start-Process $url

# Check health
Invoke-WebRequest -Uri "$url/api/health"
```

