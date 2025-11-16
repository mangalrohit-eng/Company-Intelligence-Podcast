# Environment Variables Template

Create a `.env` file in the project root with these variables:

```bash
# ============================================================================
# AI Podcast Platform - Environment Configuration
# ============================================================================

# ============================================================================
# OpenAI Configuration (Required for 'openai' provider mode)
# ============================================================================
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================================================
# AWS Configuration (Required for deployment)
# ============================================================================
# AWS Credentials (or use AWS CLI profile)
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# S3 Bucket for audio storage
S3_BUCKET_NAME=ai-podcast-audio-prod

# CloudFront Distribution (created by CDK)
CLOUDFRONT_DOMAIN=xxxxx.cloudfront.net

# ============================================================================
# Database Configuration (DynamoDB - created by CDK)
# ============================================================================
DYNAMODB_USERS_TABLE=ai-podcast-users-prod
DYNAMODB_ORGS_TABLE=ai-podcast-orgs-prod
DYNAMODB_PODCASTS_TABLE=ai-podcast-podcasts-prod
DYNAMODB_RUNS_TABLE=ai-podcast-runs-prod
DYNAMODB_EPISODES_TABLE=ai-podcast-episodes-prod
DYNAMODB_EVENTS_TABLE=ai-podcast-events-prod

# ============================================================================
# Cognito Configuration (Created by CDK)
# ============================================================================
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=your-app.auth.us-east-1.amazoncognito.com

# ============================================================================
# API Configuration
# ============================================================================
# API Gateway endpoint (created by CDK deployment)
API_BASE_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod

# For local development
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# ============================================================================
# Pipeline Configuration (Optional - defaults provided)
# ============================================================================
# Cassette storage for replay mode
CASSETTE_PATH=./cassettes

# Default providers (openai | replay | stub)
DEFAULT_LLM_PROVIDER=replay
DEFAULT_TTS_PROVIDER=stub
DEFAULT_HTTP_PROVIDER=replay

# ============================================================================
# Development Settings
# ============================================================================
NODE_ENV=development
DEBUG=false
LOG_LEVEL=info
```

## Quick Setup by Mode

### 1. Replay Mode (No .env needed!)

```bash
# Just run - works immediately!
npm run run-stage -- --stage summarize --llm replay --tts stub
```

### 2. OpenAI Mode (Minimal .env)

Create `.env` with just:

```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

### 3. AWS Production (Full .env)

Create `.env` with:

```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
```

After deployment, CDK will output the rest (API_BASE_URL, COGNITO_*, etc.)

## Security Notes

- ⚠️ **NEVER commit `.env` to git** (already in .gitignore)
- ✅ Use AWS Secrets Manager for production secrets
- ✅ Rotate API keys regularly
- ✅ Use least-privilege IAM roles

