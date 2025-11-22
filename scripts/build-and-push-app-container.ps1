# Build and push single app container
# Usage: .\scripts\build-and-push-app-container.ps1

Write-Host "Building and pushing app container..." -ForegroundColor Cyan

# Check if Docker is installed and running
Write-Host ""
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed"
    }
    Write-Host "Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "After installation, make sure Docker Desktop is running and try again." -ForegroundColor Yellow
    exit 1
}

# Check if Docker daemon is running
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker daemon not running"
    }
    Write-Host "Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker daemon is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Docker Desktop and wait for it to fully start, then try again." -ForegroundColor Yellow
    exit 1
}

# Get AWS account ID
Write-Host ""
Write-Host "Getting AWS account ID..." -ForegroundColor Yellow
$accountId = aws sts get-caller-identity --query Account --output text
if (-not $accountId) {
    Write-Host "Failed to get AWS account ID. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}
Write-Host "Account ID: $accountId" -ForegroundColor Green

# Set region
$region = "us-east-1"
$repoName = "podcast-platform-app"
$ecrUri = "$accountId.dkr.ecr.$region.amazonaws.com"

# Check if ECR repository exists, create if not
Write-Host ""
Write-Host "Checking ECR repository..." -ForegroundColor Yellow
$repoExists = aws ecr describe-repositories --repository-names $repoName --region $region 2>$null
if (-not $repoExists) {
    Write-Host "Creating ECR repository: $repoName" -ForegroundColor Yellow
    aws ecr create-repository --repository-name $repoName --region $region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create ECR repository" -ForegroundColor Red
        exit 1
    }
    Write-Host "Repository created" -ForegroundColor Green
} else {
    Write-Host "Repository exists" -ForegroundColor Green
}

# Login to ECR
Write-Host ""
Write-Host "Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $ecrUri
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to login to ECR" -ForegroundColor Red
    exit 1
}
Write-Host "Logged in" -ForegroundColor Green

# Build Docker image
Write-Host ""
Write-Host "Building Docker image (this may take a few minutes)..." -ForegroundColor Yellow
docker build -f Dockerfile -t $repoName .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "Image built" -ForegroundColor Green

# Tag image
Write-Host ""
Write-Host "Tagging image..." -ForegroundColor Yellow
$imageTag = "$ecrUri/$repoName:latest"
docker tag "$repoName`:latest" $imageTag
Write-Host "Tagged as $imageTag" -ForegroundColor Green

# Push image
Write-Host ""
Write-Host "Pushing image to ECR (this may take a few minutes)..." -ForegroundColor Yellow
docker push $imageTag
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push image" -ForegroundColor Red
    exit 1
}
Write-Host "Image pushed successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "Done! Your container is ready to use." -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Deploy infrastructure: npm run deploy" -ForegroundColor White
Write-Host "2. Get Load Balancer URL from CDK outputs" -ForegroundColor White
Write-Host "3. Access your app at the Load Balancer URL" -ForegroundColor White
