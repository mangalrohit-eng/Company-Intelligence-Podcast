# Deploy AI Podcast Platform to AWS

Complete guide to deploy your platform from GitHub to AWS.

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] AWS Account (create at https://aws.amazon.com)
- [ ] AWS CLI installed
- [ ] AWS CDK CLI installed
- [ ] AWS credentials configured
- [ ] Node.js 18+ installed ✅ (already have this)
- [ ] Git repository pushed ✅ (already done)

**Estimated Setup Time**: 30-45 minutes  
**Estimated Cost**: ~$50-100/month + usage

---

## Step 1: Install AWS CLI

### For Windows (Your System)

**Option A: Download MSI Installer**
```powershell
# Download from: https://awscli.amazonaws.com/AWSCLIV2.msi
# Run the installer
# Verify installation:
aws --version
```

**Option B: Using Chocolatey** (if you have it)
```powershell
choco install awscli
```

**Option C: Using winget**
```powershell
winget install Amazon.AWSCLI
```

After installation, **restart your terminal** and verify:
```powershell
aws --version
# Should show: aws-cli/2.x.x ...
```

---

## Step 2: Configure AWS Credentials

### Get Your AWS Credentials

1. **Sign in to AWS Console**: https://console.aws.amazon.com
2. **Go to IAM** → Users → Your Username
3. **Security Credentials** tab
4. **Create Access Key** → Select "Command Line Interface (CLI)"
5. **Download the credentials** (you'll see Access Key ID and Secret Access Key)

### Configure Credentials

```powershell
aws configure

# You'll be prompted for:
AWS Access Key ID: [paste your key]
AWS Secret Access Key: [paste your secret]
Default region name: us-east-1
Default output format: json
```

### Verify Configuration

```powershell
aws sts get-caller-identity
```

You should see your AWS account info.

---

## Step 3: Install AWS CDK CLI

```powershell
npm install -g aws-cdk

# Verify installation
cdk --version
# Should show: 2.x.x
```

---

## Step 4: Bootstrap AWS CDK

This creates the necessary S3 buckets and IAM roles for CDK deployments.

```powershell
# Get your AWS account ID
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)

# Bootstrap CDK (one-time setup)
cdk bootstrap aws://$ACCOUNT_ID/us-east-1
```

Expected output:
```
 ✅  Environment aws://123456789012/us-east-1 bootstrapped.
```

---

## Step 5: Review Infrastructure Code

Our CDK stack will create:

| Service | Purpose | Est. Cost |
|---------|---------|-----------|
| **DynamoDB** | Store podcasts, runs, episodes | ~$5/month |
| **S3** | Audio file storage | ~$5/month |
| **Lambda** | API functions | ~$10/month |
| **API Gateway** | REST API | ~$5/month |
| **Cognito** | User authentication | ~$0 (free tier) |
| **CloudFront** | Frontend distribution | ~$5/month |
| **Step Functions** | Pipeline orchestration | ~$5/month |
| **Secrets Manager** | Store OpenAI key | ~$1/month |

**Total**: ~$36/month base + usage costs

---

## Step 6: Set Up Environment Variables

Create a `.env.production` file:

```bash
# Copy from template
cp .env.example .env.production

# Edit the file:
OPENAI_API_KEY=sk-proj-your-key-here
AWS_REGION=us-east-1
NODE_ENV=production
```

---

## Step 7: Deploy Backend Infrastructure

```powershell
# Navigate to project root
cd "C:\Users\rohit.m.mangal\OneDrive - Accenture\Work\Cursor\Company Intelligence Podcast"

# Install dependencies (if not already done)
npm install

# Synthesize CloudFormation template (optional - to review)
npm run synth

# Deploy to AWS (this takes 10-15 minutes)
npm run deploy
```

### What This Does

The deployment will:
1. ✅ Create all DynamoDB tables
2. ✅ Create S3 buckets for audio and frontend
3. ✅ Deploy Lambda functions for API
4. ✅ Set up API Gateway
5. ✅ Create Cognito User Pool
6. ✅ Set up Step Functions for pipeline
7. ✅ Configure IAM roles and permissions

### Expected Output

```
✨  Synthesis time: 5.2s

PodcastPlatformStack: deploying...
PodcastPlatformStack: creating CloudFormation changeset...

 ✅  PodcastPlatformStack

✨  Deployment time: 652.18s

Outputs:
PodcastPlatformStack.ApiUrl = https://abc123.execute-api.us-east-1.amazonaws.com/prod
PodcastPlatformStack.UserPoolId = us-east-1_aBcDeFgHi
PodcastPlatformStack.UserPoolClientId = 1234567890abcdefghij
PodcastPlatformStack.FrontendBucket = podcast-platform-frontend-xyz
```

**⚠️ IMPORTANT: Save these output values!** You'll need them for frontend configuration.

---

## Step 8: Deploy Frontend

### Update Frontend Environment

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_USER_POOL_ID=us-east-1_aBcDeFgHi
NEXT_PUBLIC_USER_POOL_CLIENT_ID=1234567890abcdefghij
NEXT_PUBLIC_AWS_REGION=us-east-1
```

### Build and Deploy Frontend

```powershell
# Build Next.js for production
npm run build

# Deploy to S3 + CloudFront
npm run deploy:frontend
```

---

## Step 9: Configure Domain (Optional)

If you have a custom domain:

1. **Register domain** in Route 53 (or use existing)
2. **Update CDK stack** with domain configuration
3. **Create SSL certificate** in ACM
4. **Redeploy stack**

---

## Step 10: Create First User

```powershell
# Create admin user
aws cognito-idp admin-create-user `
  --user-pool-id us-east-1_aBcDeFgHi `
  --username admin@yourcompany.com `
  --user-attributes Name=email,Value=admin@yourcompany.com `
  --temporary-password "TempPass123!"
```

---

## Step 11: Test the Deployment

### Test API Endpoints

```powershell
# Get API URL from CDK outputs
$API_URL = "https://abc123.execute-api.us-east-1.amazonaws.com/prod"

# Test health endpoint
curl "$API_URL/health"
```

### Test Frontend

1. Open CloudFront URL (from CDK outputs)
2. Sign in with the user you created
3. Navigate to "Test Pipeline"
4. Try running a stage with OpenAI

---

## 🔧 Post-Deployment Configuration

### 1. Store OpenAI Key in Secrets Manager

```powershell
aws secretsmanager create-secret `
  --name podcast-platform/openai-key `
  --secret-string '{"apiKey":"sk-proj-your-key-here"}'
```

### 2. Update Lambda Environment Variables

The CDK stack should automatically configure Lambdas to read from Secrets Manager.

### 3. Set Up CloudWatch Alarms (Recommended)

Monitor:
- Lambda errors
- API Gateway 4xx/5xx errors
- DynamoDB throttling
- S3 storage usage

---

## 📊 Verify Deployment

### Check All Resources

```powershell
# List DynamoDB tables
aws dynamodb list-tables

# List S3 buckets
aws s3 ls | Select-String "podcast"

# List Lambda functions
aws lambda list-functions --query 'Functions[].FunctionName' | Select-String "podcast"

# Check API Gateway
aws apigateway get-rest-apis --query 'items[].name'
```

---

## 🎉 Deployment Complete!

Your AI Podcast Platform is now live on AWS!

### Access Points

- **Frontend**: https://[cloudfront-url].cloudfront.net
- **API**: https://[api-id].execute-api.us-east-1.amazonaws.com/prod
- **Admin**: Sign in at frontend URL

### Next Steps

1. ✅ Create your first podcast via the UI
2. ✅ Run a test pipeline execution
3. ✅ Set up monitoring and alerts
4. ✅ Configure custom domain (optional)
5. ✅ Invite team members

---

## 💰 Cost Management

### Monitor Costs

```powershell
# Get current month costs
aws ce get-cost-and-usage `
  --time-period Start=2024-11-01,End=2024-11-30 `
  --granularity MONTHLY `
  --metrics BlendedCost `
  --filter file://cost-filter.json
```

### Set Up Budget Alerts

1. Go to **AWS Billing Console**
2. **Budgets** → Create Budget
3. Set monthly budget (e.g., $100)
4. Configure email alerts at 80%, 100%

---

## 🛠️ Troubleshooting

### Issue: CDK Deploy Fails

```powershell
# Check CDK version
cdk --version

# Update CDK
npm update -g aws-cdk

# Clear CDK cache
rm -rf cdk.out

# Retry deployment
npm run deploy
```

### Issue: Lambda Timeout

- Default timeout: 30 seconds
- For pipeline stages, increase to 5 minutes
- Edit `infra/cdk/lib/podcast-platform-stack.ts`

### Issue: API Gateway CORS Errors

- Check API Gateway CORS configuration
- Ensure frontend URL is in allowed origins

### Issue: Cognito Authentication Fails

- Verify User Pool configuration
- Check Cognito App Client settings
- Ensure redirect URLs are correct

---

## 🔄 Update Deployment

When you make code changes:

```powershell
# Pull latest from GitHub
git pull origin master

# Reinstall dependencies
npm install

# Redeploy infrastructure
npm run deploy

# Rebuild and redeploy frontend
npm run build
npm run deploy:frontend
```

---

## 🗑️ Teardown (If Needed)

To delete all AWS resources:

```powershell
# WARNING: This deletes EVERYTHING
npm run destroy

# Confirm deletion when prompted
```

**Note**: S3 buckets with content must be manually emptied first.

---

## 📞 Support

### AWS Issues
- AWS Support Console
- AWS Forums
- Stack Overflow (`aws-cdk` tag)

### Application Issues
- GitHub Issues: https://github.com/mangalrohit-eng/Company-Intelligence-Podcast/issues
- Check logs: CloudWatch Logs

---

## ✅ Deployment Checklist

- [ ] AWS CLI installed and configured
- [ ] AWS CDK installed
- [ ] CDK bootstrapped
- [ ] Environment variables set
- [ ] Backend infrastructure deployed
- [ ] Frontend built and deployed
- [ ] First user created
- [ ] API tested
- [ ] Frontend tested
- [ ] CloudWatch alarms configured
- [ ] Budget alerts set up
- [ ] Documentation updated with URLs

---

**Deployment Guide Version**: 1.0  
**Last Updated**: 2024-11-16  
**Platform**: Windows 10/11  
**AWS Region**: us-east-1 (Virginia)

