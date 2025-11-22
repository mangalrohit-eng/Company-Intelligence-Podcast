# 🚀 Quick Start: Containerize Your App (Simple Version)

## What You're Getting

**ECS Fargate** - The simplest option that just works:
- ✅ No infrastructure to manage
- ✅ Auto-scales automatically  
- ✅ Already integrated with your Step Functions
- ✅ Pay only when running

---

## 3 Simple Steps

### **Step 1: Build & Push Container** (5 minutes)

```powershell
# Run the automated script
.\scripts\build-and-push-container.ps1
```

**What it does:**
- Creates ECR repository (if needed)
- Builds Docker image
- Pushes to AWS

**Or do it manually:**
```powershell
# Get your account ID
$accountId = aws sts get-caller-identity --query Account --output text

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $accountId.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -f containers/scraper/Dockerfile -t podcast-scraper .
docker tag podcast-scraper:latest $accountId.dkr.ecr.us-east-1.amazonaws.com/podcast-scraper:latest
docker push $accountId.dkr.ecr.us-east-1.amazonaws.com/podcast-scraper:latest
```

### **Step 2: Deploy Infrastructure** (10 minutes)

```powershell
npm run deploy
```

**What it does:**
- Creates ECS task definition
- Sets up IAM roles
- Configures CloudWatch logging
- Exports values for Step Functions

### **Step 3: Test It** (2 minutes)

1. Go to your UI: `http://localhost:3000`
2. Create a podcast
3. Click "Run Now"
4. Watch it work! 🎉

---

## What's Already Done For You

✅ **Dockerfile created** - `containers/scraper/Dockerfile`  
✅ **CDK code updated** - ECS Fargate task definition added  
✅ **Build script** - `scripts/build-and-push-container.ps1`  
✅ **Step Functions** - Already configured to use ECS  

---

## Troubleshooting

### "Docker not found"
```powershell
# Install Docker Desktop for Windows
# Download from: https://www.docker.com/products/docker-desktop
```

### "AWS CLI not configured"
```powershell
aws configure
# Enter your AWS credentials
```

### "Container won't start"
```powershell
# Check CloudWatch Logs
aws logs tail /ecs/podcast-scraper --follow
```

---

## That's It!

**Total time**: ~20 minutes  
**Complexity**: Simple  
**Result**: Containerized scraper running on ECS Fargate  

No infrastructure management. No EC2 instances. Just works. 🎉

---

## Next Steps (Optional)

- Containerize pipeline engine (if stages take > 15 min)
- Add more containers as needed
- Scale up/down automatically

But for now, you're done! Your scraper is containerized and ready to go.

