# 🌐 Production Access Guide

**Your AI Podcast Platform is LIVE!**

---

## 🎯 Quick Access

### **Production Website**
```
https://dhycfwg0k4xij.cloudfront.net
```
✅ Full Next.js frontend deployed  
✅ Connected to AWS backend  
✅ Global CDN (CloudFront)

### **API Endpoint**
```
https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com
```

### **Local Development**
```
http://localhost:3000
```
Currently running on your machine

---

## 🔐 AWS Console Access

### **CloudFormation Stack**
https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=arn:aws:cloudformation:us-east-1:098478926952:stack/PodcastPlatformStack/49d44520-c330-11f0-ac81-0e1db41dab83

### **Step Functions Pipeline**
https://console.aws.amazon.com/states/home?region=us-east-1#/statemachines/view/arn:aws:states:us-east-1:098478926952:stateMachine:podcast-pipeline

### **API Gateway**
https://console.aws.amazon.com/apigateway/main/apis?region=us-east-1

### **DynamoDB Tables**
https://console.aws.amazon.com/dynamodbv2/home?region=us-east-1#tables

### **S3 Buckets**
https://s3.console.aws.amazon.com/s3/buckets?region=us-east-1

### **Cognito User Pool**
https://console.aws.amazon.com/cognito/v2/idp/user-pools?region=us-east-1

### **CloudFront Distribution**
https://console.aws.amazon.com/cloudfront/v3/home?region=us-east-1#/distributions

---

## 📝 Configuration Details

### **Cognito**
- **User Pool ID**: `us-east-1_lvLcARe2P`
- **Client ID**: `3lm7s5lml6i0va070cm1c3uafn`
- **Region**: `us-east-1`

### **S3 Buckets**
- **Frontend**: `podcast-platform-frontend-098478926952`
- **Media**: `podcast-platform-media-098478926952`
- **RSS**: `podcast-platform-rss-098478926952`

### **API Routes**
- **POST /podcasts** → Create podcast
- **GET /podcasts** → List podcasts

---

## 🚀 How to Use the Production Website

### **1. Access the Website**
Open https://dhycfwg0k4xij.cloudfront.net in your browser

### **2. Navigate to Test Pipeline**
Click on "Test Pipeline" in the sidebar

### **3. Run a Pipeline Stage**
- Select a stage (e.g., "Prepare", "Discover")
- Choose mode: "Free Mode" (replay/stub) or "Real AI Mode" (OpenAI)
- Click "Run Stage"
- View results and output files

### **4. Create a New Podcast**
- Click "Podcasts" → "Create New"
- Follow the 5-step wizard
- Configure company, industry, competitors
- Set schedule and delivery options
- Launch your podcast!

---

## 🛠️ Run Full Pipeline

### **Method 1: AWS Console**

1. Go to Step Functions: https://console.aws.amazon.com/states/home?region=us-east-1
2. Open `podcast-pipeline`
3. Click "Start execution"
4. Use this input:

```json
{
  "runId": "run-001",
  "podcastId": "podcast-001",
  "config": {
    "companyId": "Verizon",
    "industry": "Telecommunications",
    "competitors": ["AT&T", "T-Mobile"],
    "durationMinutes": 5,
    "voice": "onyx"
  },
  "flags": {
    "enable": {
      "discover": true,
      "scrape": true,
      "extract": true,
      "tts": true
    },
    "providers": {
      "llmProvider": "openai",
      "ttsProvider": "openai",
      "httpProvider": "playwright"
    }
  }
}
```

5. Click "Start execution"
6. Monitor real-time progress

### **Method 2: AWS CLI**

```bash
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:098478926952:stateMachine:podcast-pipeline \
  --input file://input.json
```

### **Method 3: Local CLI**

```bash
npm run run-stage -- --stage prepare --llm openai --tts openai
npm run run-stage -- --stage discover --llm openai
npm run run-stage -- --stage outline --llm openai
```

---

## 🔄 Update Deployment

### **Update Backend Infrastructure**
```bash
npm run deploy
```

### **Update Frontend**
```bash
powershell -ExecutionPolicy Bypass -File scripts/deploy-frontend.ps1
```

### **Quick Update (Hotswap)**
```bash
npm run deploy:update
```

---

## 👥 Create Users

### **Create Admin User**
```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_lvLcARe2P \
  --username admin@yourcompany.com \
  --user-attributes Name=email,Value=admin@yourcompany.com \
  --temporary-password "TempPass123!"
```

### **Sign Up via Website**
1. Go to https://dhycfwg0k4xij.cloudfront.net
2. Click "Sign Up"
3. Enter email and password
4. Verify email
5. Sign in

---

## 📊 Monitor & Debug

### **CloudWatch Logs**
```bash
# List log groups
aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, `PodcastPlatformStack`)].logGroupName'

# View logs
aws logs tail /aws/lambda/podcast-create --follow
```

### **Check API Health**
```bash
curl https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com/podcasts
```

### **View Step Functions Executions**
```bash
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:098478926952:stateMachine:podcast-pipeline \
  --max-results 10
```

---

## 💰 Current Costs

### **Monthly Base**
- NAT Gateway: ~$33/month
- DynamoDB: ~$5/month (on-demand)
- S3: ~$2/month (minimal storage)
- CloudFront: ~$5/month (first 1TB free)
- Lambda: $0 (free tier)
- **Total**: ~$45/month

### **Per Podcast**
- OpenAI API calls: ~$1.25/podcast
- 20 podcasts/month = **$25/month**

**Total Monthly Cost**: ~$70/month

---

## 🧹 Cleanup (If Needed)

### **Delete Everything**
```bash
npm run destroy
```

### **Manual Cleanup**
1. Empty S3 buckets first:
```bash
aws s3 rm s3://podcast-platform-frontend-098478926952 --recursive
aws s3 rm s3://podcast-platform-media-098478926952 --recursive
aws s3 rm s3://podcast-platform-rss-098478926952 --recursive
```

2. Then destroy stack:
```bash
cd infra/cdk
cdk destroy
```

---

## ✅ Verification Checklist

- [x] Frontend website is accessible
- [x] API Gateway is responding
- [x] Step Functions pipeline is configured
- [x] DynamoDB tables are active
- [x] S3 buckets are created
- [x] Cognito is set up
- [x] CloudFront distribution is active
- [x] Lambda functions are deployed
- [x] All code committed to GitHub

---

## 🎉 You're All Set!

Your AI Podcast Platform is **production-ready** and accessible at:

**https://dhycfwg0k4xij.cloudfront.net**

- ✅ Frontend deployed and live
- ✅ API Gateway connected
- ✅ Step Functions pipeline ready
- ✅ Database and storage configured
- ✅ Authentication system active
- ✅ Local development running
- ✅ All code on GitHub

**Start creating AI-powered podcasts now!** 🎙️

---

**Last Updated**: November 16, 2024  
**Region**: us-east-1  
**Account**: 098478926952  
**Status**: ✅ **PRODUCTION LIVE**

