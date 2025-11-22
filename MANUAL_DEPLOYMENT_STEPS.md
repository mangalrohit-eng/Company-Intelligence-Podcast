# Manual CDK Deployment Steps

## Prerequisites
- AWS CLI configured with appropriate credentials
- CDK CLI installed (`npm install -g aws-cdk`)
- Docker image already built and pushed to ECR (✅ Done)

## Step 1: Navigate to CDK Directory
```powershell
cd C:\Users\rohit.m.mangal\Cursor\company-intel-podcast\infra\cdk
```

## Step 2: Bootstrap CDK (if not already done)
```powershell
cdk bootstrap aws://098478926952/us-east-1
```

## Step 3: Review Changes (Optional)
```powershell
cdk diff
```
This shows what will be created/updated.

## Step 4: Deploy the Stack

### Option A: Deploy with automatic approval (recommended)
```powershell
cdk deploy --require-approval never
```
**Note:** Use `--require-approval never` (not `n` or any other abbreviation)

### Option B: Deploy with manual approval
```powershell
cdk deploy
```
When prompted, type `y` and press Enter to approve the security changes.

## Step 5: Wait for Deployment
- Deployment typically takes **10-15 minutes**
- You'll see progress in the terminal
- The stack will create:
  - ECS Fargate service
  - Application Load Balancer
  - Security groups
  - IAM roles and policies
  - CloudWatch log groups

## Step 6: Get the Load Balancer URL

After deployment completes, run:

```powershell
aws cloudformation describe-stacks --stack-name PodcastPlatformStack --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' --output text
```

Or check the CloudFormation console:
1. Go to AWS Console → CloudFormation
2. Select `PodcastPlatformStack`
3. Click the **Outputs** tab
4. Find `AppLoadBalancerUrl` and copy the value

## Step 7: Access Your Application

1. **Wait 2-3 minutes** after deployment for the ECS service to start containers
2. Open the Load Balancer URL in your browser
3. Check health endpoint: `http://<alb-url>/api/health`
4. Access the app: `http://<alb-url>/`

## Troubleshooting

### If deployment fails:
1. Check CloudFormation console for error details
2. Check CloudWatch logs: `/aws/codebuild/podcast-platform-build`
3. Verify ECR image exists:
   ```powershell
   aws ecr describe-images --repository-name podcast-platform-app --region us-east-1
   ```

### If ECS service doesn't start:
1. Check ECS console → Clusters → PodcastPlatformStack → Services
2. Check task logs in CloudWatch: `/ecs/podcast-platform-app`
3. Verify security groups allow traffic on port 3000

### To check deployment status:
```powershell
aws cloudformation describe-stacks --stack-name PodcastPlatformStack --region us-east-1 --query 'Stacks[0].StackStatus' --output text
```

## What Gets Deployed

- **ECS Fargate Service**: Runs your containerized Next.js app
- **Application Load Balancer**: Routes traffic to your containers
- **VPC & Networking**: Isolated network for your containers
- **Security Groups**: Firewall rules for traffic
- **IAM Roles**: Permissions for ECS tasks
- **CloudWatch Logs**: Application logging
- **DynamoDB Tables**: Already exist (not recreated)
- **S3 Buckets**: Already exist (not recreated)

## Next Steps After Deployment

1. Test the application at the Load Balancer URL
2. Monitor CloudWatch logs for any errors
3. Check ECS service health in the AWS Console
4. Update environment variables if needed (requires redeployment)

