# Setup Guide - AI Podcast Platform

This guide walks you through setting up the AI Podcast Platform from scratch.

## Table of Contents

1. [Quick Start (No Credentials)](#quick-start-no-credentials)
2. [OpenAI Integration](#openai-integration)
3. [AWS Deployment](#aws-deployment)
4. [Troubleshooting](#troubleshooting)

---

## Quick Start (No Credentials)

**You can start using the platform immediately without any API keys or AWS setup!**

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Run Pipeline in Replay Mode

```bash
# Uses recorded API responses (no cost, no API keys needed)
npm run run-stage -- --stage summarize --in fixtures/summarize/in.json --out output.json --llm replay --tts stub
```

**What's happening:**
- `--llm replay`: Uses pre-recorded OpenAI responses from `cassettes/`
- `--tts stub`: Uses mock audio generation
- **No API keys required!**
- **Zero cost!**

### Step 3: Start Frontend (Optional)

```bash
npm run dev
```

Visit `http://localhost:3000` to see the UI.

---

## OpenAI Integration

**When you're ready to use real AI generation:**

### Step 1: Get OpenAI API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create account or sign in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...`)

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` and add your key:

```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

### Step 3: Run with OpenAI

```bash
# Now uses real OpenAI API (costs money!)
npm run run-stage -- --stage summarize --in fixtures/summarize/in.json --out output.json --llm openai --tts openai
```

### Cost Estimates

| Stage | Model | Approx Cost (10min episode) |
|-------|-------|----------------------------|
| Discover | GPT-4 | $0.10 |
| Extract | GPT-4 | $0.30 |
| Summarize | GPT-4 | $0.20 |
| Script | GPT-4 | $0.50 |
| TTS | TTS-1-HD | $0.45 (3000 words) |
| **Total** | | **~$1.55/episode** |

💡 **Tip:** Use replay mode during development to avoid costs!

---

## AWS Deployment

**For production deployment with full automation:**

### Prerequisites

- AWS Account ([Sign up](https://aws.amazon.com/))
- AWS CLI installed ([Install guide](https://aws.amazon.com/cli/))
- Node.js 18+

### Step 1: Configure AWS CLI

```bash
# Configure with your AWS credentials
aws configure

# You'll be asked for:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Output format (json)
```

**How to get AWS credentials:**
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Click your name → Security Credentials
3. Create Access Key
4. Download and save securely

### Step 2: Update .env

```bash
# In your .env file
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-12-digit-account-id
```

To find your AWS Account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

### Step 3: Bootstrap CDK (First time only)

```bash
npx cdk bootstrap aws://YOUR-ACCOUNT-ID/us-east-1
```

### Step 4: Deploy Infrastructure

```bash
# Deploy full backend infrastructure
npm run deploy
```

This creates:
- ✅ API Gateway + Lambda functions
- ✅ DynamoDB tables
- ✅ Cognito User Pool
- ✅ S3 bucket for audio
- ✅ CloudFront CDN
- ✅ Step Functions state machine
- ✅ ECS Fargate cluster

**Deployment takes ~10-15 minutes**

### Step 5: Deploy Frontend

```bash
# Build and deploy Next.js app
npm run deploy:frontend
```

### Step 6: Get Deployment URLs

After deployment, CDK outputs:

```
Outputs:
PodcastPlatformStack.ApiEndpoint = https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
PodcastPlatformStack.CognitoDomain = your-app.auth.us-east-1.amazoncognito.com
PodcastPlatformStack.CloudFrontUrl = https://xxxxx.cloudfront.net
```

Update your `.env`:

```bash
API_BASE_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
COGNITO_DOMAIN=your-app.auth.us-east-1.amazoncognito.com
CLOUDFRONT_DOMAIN=xxxxx.cloudfront.net
```

---

## Configuration Summary

### Three Modes of Operation

| Mode | API Keys Needed | AWS Needed | Cost | Use Case |
|------|----------------|------------|------|----------|
| **Replay (Default)** | ❌ None | ❌ No | $0 | Development, testing |
| **OpenAI** | ✅ OpenAI | ❌ No | ~$1.55/episode | Local generation |
| **Production** | ✅ OpenAI | ✅ Yes | ~$1.55/episode + AWS | Full deployment |

### Environment Variables by Mode

**Replay Mode (No setup required):**
```bash
# Nothing needed! Works out of the box
npm run run-stage -- --stage summarize --llm replay
```

**OpenAI Mode:**
```bash
OPENAI_API_KEY=sk-proj-xxxxx
```

**Production Deployment:**
```bash
# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx

# AWS
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# These are populated after deployment:
API_BASE_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET_NAME=ai-podcast-audio-prod-xxxxx
```

---

## Troubleshooting

### "OpenAI API key not found"

**Solution:** 
```bash
# Make sure .env exists and has your key
cat .env | grep OPENAI_API_KEY

# If missing:
echo "OPENAI_API_KEY=sk-proj-your-key" >> .env
```

### "AWS credentials not configured"

**Solution:**
```bash
# Check AWS configuration
aws sts get-caller-identity

# If error, reconfigure:
aws configure
```

### "CDK deployment failed"

**Common causes:**
1. **Not bootstrapped:** Run `npx cdk bootstrap`
2. **Wrong region:** Check `AWS_REGION` in `.env`
3. **Insufficient permissions:** Need admin or power user access

### "Module not found" errors

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### "Cassettes not found"

**Solution:**
```bash
# Cassettes should exist in repo, but if missing:
mkdir -p cassettes/default
# Or use --llm stub mode instead
```

---

## Next Steps

- ✅ **Tested locally?** → [Deploy to AWS](#aws-deployment)
- ✅ **Deployed to AWS?** → Check [API Documentation](./API.md)
- ✅ **Want to contribute?** → See [DEVELOPMENT.md](./DEVELOPMENT.md)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation:** [Full Docs](./docs/)

---

**Remember:** Start with replay mode (no credentials) → Add OpenAI when ready → Deploy to AWS for production! 🚀

