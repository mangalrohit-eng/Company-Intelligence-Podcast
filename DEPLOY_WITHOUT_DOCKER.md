# 🚀 Deploy Docker Container Without Local Docker

This guide helps you deploy the Docker container when Docker is blocked on your local machine.

## Option 1: AWS CodeBuild (Recommended)

AWS CodeBuild will build your Docker image in the cloud.

### Step 1: Setup CodeBuild Project

```powershell
.\scripts\setup-codebuild.ps1
```

This creates:
- ECR repository (if needed)
- IAM role for CodeBuild
- CodeBuild project

### Step 2: Prepare and Upload Source

```powershell
# Prepare source code
.\scripts\prepare-codebuild-source.ps1

# Upload and trigger build
.\scripts\trigger-codebuild.ps1
```

The build will take 10-15 minutes. Monitor progress in the AWS Console or with:

```powershell
aws codebuild list-builds-for-project --project-name podcast-platform-build --region us-east-1
```

### Step 3: Deploy Infrastructure

Once the build completes and the image is pushed to ECR:

```powershell
npm run deploy
```

---

## Option 2: AWS CloudShell (Quick Alternative)

AWS CloudShell has Docker pre-installed.

### Step 1: Open CloudShell

1. Go to AWS Console → CloudShell
2. Wait for CloudShell to initialize

### Step 2: Upload Your Code

In CloudShell:

```bash
# Create a directory
mkdir podcast-platform
cd podcast-platform

# Upload your code (use the upload button in CloudShell UI)
# Or clone from git if your repo is accessible
```

### Step 3: Build and Push

```bash
# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"
REPO_NAME="podcast-platform-app"
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

# Build image
docker build -f Dockerfile -t $REPO_NAME .

# Tag and push
docker tag $REPO_NAME:latest $ECR_URI/$REPO_NAME:latest
docker push $ECR_URI/$REPO_NAME:latest
```

### Step 4: Deploy Infrastructure

From your local machine:

```powershell
npm run deploy
```

---

## Option 3: GitHub Actions (If Using Git)

If your code is in GitHub, you can use GitHub Actions to build and push.

### Create `.github/workflows/build-and-push.yml`:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: podcast-platform-app

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: latest
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
```

Then push to GitHub and the workflow will build and push automatically.

---

## Option 4: Use Another Machine

If you have access to another machine (personal laptop, EC2 instance, etc.) with Docker:

1. Copy your code to that machine
2. Run the build script there:
   ```powershell
   .\scripts\build-and-push-app-container.ps1
   ```
3. Deploy from your local machine:
   ```powershell
   npm run deploy
   ```

---

## Verify Image Was Pushed

After any method, verify the image is in ECR:

```powershell
$accountId = aws sts get-caller-identity --query Account --output text
aws ecr describe-images --repository-name podcast-platform-app --region us-east-1
```

You should see the `latest` tag.

---

## Deploy Infrastructure

Once the image is in ECR, deploy the infrastructure:

```powershell
npm run deploy
```

This will create:
- ECS Fargate service
- Application Load Balancer
- Auto-scaling configuration

---

## Get Your Application URL

After deployment:

```powershell
aws cloudformation describe-stacks --stack-name PodcastPlatformStack --query 'Stacks[0].Outputs[?OutputKey==`AppLoadBalancerUrl`].OutputValue' --output text
```

---

## Troubleshooting

### CodeBuild fails

Check logs:
```powershell
aws codebuild batch-get-builds --ids <build-id> --region us-east-1
```

### Image not found in ECR

Make sure:
1. Build completed successfully
2. Image was pushed to the correct repository
3. Repository name matches: `podcast-platform-app`

### ECS service can't pull image

Make sure:
1. ECS task role has ECR permissions (should be set by CDK)
2. Image tag is `latest`
3. Repository URI is correct

---

**Recommended: Use Option 1 (CodeBuild) for the most automated experience.**

