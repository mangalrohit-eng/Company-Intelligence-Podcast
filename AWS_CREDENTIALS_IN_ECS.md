# AWS Credentials and Environment Variables in ECS

## Key Difference: IAM Roles vs Access Keys

### ❌ Local Development (Your Machine)
```bash
# .env file
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_REGION=us-east-1
```

**Why:** Your local machine needs explicit credentials to call AWS APIs.

### ✅ Production (ECS Containers)
```typescript
// NO AWS_ACCESS_KEY or AWS_SECRET_ACCESS_KEY needed!
taskRole: appTaskRole,  // IAM role attached to container
```

**Why:** ECS containers use **IAM roles**, not access keys. Much more secure!

---

## How AWS Credentials Work in ECS

### The Magic: IAM Task Roles

When your container runs in ECS:

1. **ECS attaches an IAM role** to the container (the `taskRole`)
2. **AWS SDK automatically uses the role** - no credentials needed!
3. **Temporary credentials are provided** by the ECS task role
4. **No secrets to manage** - AWS handles everything

### Your CDK Configuration

```typescript
// IAM role for app tasks
const appTaskRole = new iam.Role(this, 'AppTaskRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  description: 'Role for app ECS tasks',
});

// Grant permissions
mediaBucket.grantReadWrite(appTaskRole);
runsTable.grantReadWriteData(appTaskRole);
// ... etc

// Attach role to task
const appTaskDef = new ecs.FargateTaskDefinition(this, 'AppTaskDef', {
  taskRole: appTaskRole,  // ← This gives the container AWS access!
});
```

**Result:** Your container can access:
- ✅ DynamoDB tables (read/write)
- ✅ S3 buckets (read/write)
- ✅ Secrets Manager (read secrets)
- ✅ Step Functions (start executions)
- ✅ All other AWS services you granted permissions to

**No `AWS_ACCESS_KEY` or `AWS_SECRET_ACCESS_KEY` needed!**

---

## Environment Variables Already Set in CDK

Looking at your CDK stack (lines 481-493), these are **already configured**:

```typescript
environment: {
  AWS_REGION: this.region,                    // ✅ Set to 'us-east-1'
  PODCASTS_TABLE: podcastsTable.tableName,    // ✅ DynamoDB table name
  PODCAST_CONFIGS_TABLE: ...,                 // ✅ DynamoDB table name
  PODCAST_COMPETITORS_TABLE: ...,             // ✅ DynamoDB table name
  PODCAST_TOPICS_TABLE: ...,                  // ✅ DynamoDB table name
  RUNS_TABLE: runsTable.tableName,           // ✅ DynamoDB table name
  EVENTS_TABLE: eventsTable.tableName,        // ✅ DynamoDB table name
  EPISODES_TABLE: episodesTable.tableName,   // ✅ DynamoDB table name
  MEDIA_BUCKET: mediaBucket.bucketName,      // ✅ S3 bucket name
  RSS_BUCKET: rssBucket.bucketName,          // ✅ S3 bucket name
  USER_POOL_ID: userPool.userPoolId,          // ✅ Cognito User Pool ID
  USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId, // ✅ Cognito Client ID
  NODE_ENV: 'production',                     // ✅ Environment
  PORT: '3000',                               // ✅ Port
},
secrets: {
  OPENAI_API_KEY: ecs.Secret.fromSecretsManager(openaiSecret, 'apiKey'), // ✅ From Secrets Manager
}
```

---

## What's NOT Needed in ECS

### ❌ AWS_ACCESS_KEY_ID
**Why not needed:** ECS uses IAM roles, not access keys.

### ❌ AWS_SECRET_ACCESS_KEY
**Why not needed:** ECS uses IAM roles, not access keys.

### ❌ AWS_SESSION_TOKEN
**Why not needed:** ECS handles temporary credentials automatically.

### ❌ AWS_ACCOUNT_ID
**Why not needed:** Not typically used by the application code. Only needed for CDK deployment.

---

## Comparison: Local vs Production

| Variable | Local (.env) | Production (ECS) | How |
|---------|-------------|------------------|-----|
| `AWS_ACCESS_KEY_ID` | ✅ Required | ❌ **Not needed** | IAM role instead |
| `AWS_SECRET_ACCESS_KEY` | ✅ Required | ❌ **Not needed** | IAM role instead |
| `AWS_REGION` | ✅ Required | ✅ **Set in CDK** | `environment: { AWS_REGION: this.region }` |
| `AWS_ACCOUNT_ID` | ✅ For CDK | ❌ **Not needed** | Only for deployment |
| `PODCASTS_TABLE` | ✅ From .env | ✅ **Set in CDK** | `environment: { PODCASTS_TABLE: ... }` |
| `MEDIA_BUCKET` | ✅ From .env | ✅ **Set in CDK** | `environment: { MEDIA_BUCKET: ... }` |
| `USER_POOL_ID` | ✅ From .env | ✅ **Set in CDK** | `environment: { USER_POOL_ID: ... }` |
| `OPENAI_API_KEY` | ✅ From .env | ✅ **From Secrets Manager** | `secrets: { OPENAI_API_KEY: ... }` |

---

## How AWS SDK Works in ECS

### In Your Application Code

```typescript
// No credentials needed!
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// AWS SDK automatically uses the IAM role
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,  // ← Only region needed!
  // No credentials needed - ECS provides them via IAM role
});
```

**The AWS SDK automatically:**
1. Detects it's running in ECS
2. Retrieves temporary credentials from the IAM role
3. Uses those credentials for all AWS API calls
4. Refreshes credentials automatically

---

## What About Other .env Variables?

### Already Handled by CDK ✅

- ✅ `AWS_REGION` → Set in CDK
- ✅ `PODCASTS_TABLE` → Set in CDK
- ✅ `RUNS_TABLE` → Set in CDK
- ✅ `MEDIA_BUCKET` → Set in CDK
- ✅ `USER_POOL_ID` → Set in CDK
- ✅ `USER_POOL_CLIENT_ID` → Set in CDK

### Needs Secrets Manager 🔐

- 🔐 `OPENAI_API_KEY` → From Secrets Manager (already configured)

### Not Needed in Production ❌

- ❌ `AWS_ACCESS_KEY_ID` → Use IAM role
- ❌ `AWS_SECRET_ACCESS_KEY` → Use IAM role
- ❌ `AWS_ACCOUNT_ID` → Only for CDK deployment
- ❌ `NEXT_PUBLIC_API_URL` → Not needed (app runs on same domain)
- ❌ `API_BASE_URL` → Not needed (app runs on same domain)

---

## Summary

### Local Development
```bash
# .env file needed
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
PODCASTS_TABLE=...
OPENAI_API_KEY=...
```

### Production (ECS)
```typescript
// CDK sets everything automatically:
environment: {
  AWS_REGION: 'us-east-1',           // ✅
  PODCASTS_TABLE: 'podcasts',         // ✅
  // ... all table/bucket names        // ✅
},
secrets: {
  OPENAI_API_KEY: fromSecretsManager, // ✅
},
// IAM role provides AWS credentials   // ✅
```

**Key Takeaway:** In ECS, you don't need `AWS_ACCESS_KEY` or `AWS_SECRET_ACCESS_KEY`. The IAM role attached to the task provides all AWS credentials automatically and securely!

