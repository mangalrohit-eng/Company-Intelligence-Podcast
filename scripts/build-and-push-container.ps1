# Simple script to build and push scraper container to ECR
# Usage: .\scripts\build-and-push-container.ps1

Write-Host "🐳 Building and pushing scraper container..." -ForegroundColor Cyan

# Get AWS account ID
Write-Host "`n📋 Getting AWS account ID..." -ForegroundColor Yellow
$accountId = aws sts get-caller-identity --query Account --output text
if (-not $accountId) {
    Write-Host "❌ Failed to get AWS account ID. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Account ID: $accountId" -ForegroundColor Green

# Set region
$region = "us-east-1"
$repoName = "podcast-scraper"
$ecrUri = "$accountId.dkr.ecr.$region.amazonaws.com"

# Check if ECR repository exists, create if not
Write-Host "`n📦 Checking ECR repository..." -ForegroundColor Yellow
$repoExists = aws ecr describe-repositories --repository-names $repoName --region $region 2>$null
if (-not $repoExists) {
    Write-Host "Creating ECR repository: $repoName" -ForegroundColor Yellow
    aws ecr create-repository --repository-name $repoName --region $region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create ECR repository" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Repository created" -ForegroundColor Green
} else {
    Write-Host "✅ Repository exists" -ForegroundColor Green
}

# Login to ECR
Write-Host "`n🔐 Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $ecrUri
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to login to ECR" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in" -ForegroundColor Green

# Build Docker image
Write-Host "`n🔨 Building Docker image..." -ForegroundColor Yellow
docker build -f containers/scraper/Dockerfile -t $repoName .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Image built" -ForegroundColor Green

# Tag image
Write-Host "`n🏷️  Tagging image..." -ForegroundColor Yellow
$imageTag = "$ecrUri/$repoName:latest"
docker tag $repoName`:latest $imageTag
Write-Host "✅ Tagged as $imageTag" -ForegroundColor Green

# Push image
Write-Host "`n📤 Pushing image to ECR..." -ForegroundColor Yellow
docker push $imageTag
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push image" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Image pushed successfully!" -ForegroundColor Green

Write-Host "`n🎉 Done! Your container is ready to use." -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Deploy infrastructure: npm run deploy" -ForegroundColor White
Write-Host "2. Test by triggering a pipeline run" -ForegroundColor White

