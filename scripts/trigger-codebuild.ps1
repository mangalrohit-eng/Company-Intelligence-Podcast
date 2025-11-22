# Trigger CodeBuild to build and push Docker image
# Usage: .\scripts\trigger-codebuild.ps1

Write-Host "Triggering CodeBuild to build Docker image..." -ForegroundColor Cyan

# Get AWS account ID
$accountId = aws sts get-caller-identity --query Account --output text
if (-not $accountId) {
    Write-Host "Failed to get AWS account ID. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}

$region = "us-east-1"
$projectName = "podcast-platform-build"
$bucketName = "podcast-platform-source-bucket-$accountId"
$zipFile = "source.zip"

# Check if source zip exists
if (-not (Test-Path $zipFile)) {
    Write-Host "Source zip file not found. Creating it..." -ForegroundColor Yellow
    .\scripts\prepare-codebuild-source.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create source zip" -ForegroundColor Red
        exit 1
    }
}

# Create S3 bucket if it doesn't exist
Write-Host ""
Write-Host "Checking S3 bucket..." -ForegroundColor Yellow
$bucketExists = aws s3 ls "s3://$bucketName" 2>$null
if (-not $bucketExists) {
    Write-Host "Creating S3 bucket: $bucketName" -ForegroundColor Yellow
    aws s3 mb "s3://$bucketName" --region $region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create S3 bucket" -ForegroundColor Red
        exit 1
    }
    Write-Host "Bucket created" -ForegroundColor Green
} else {
    Write-Host "Bucket exists" -ForegroundColor Green
}

# Upload source zip to S3
Write-Host ""
Write-Host "Uploading source to S3..." -ForegroundColor Yellow
$s3Key = "source.zip"
aws s3 cp $zipFile "s3://$bucketName/$s3Key" --region $region
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload source to S3" -ForegroundColor Red
    exit 1
}
Write-Host "Source uploaded" -ForegroundColor Green

# Start CodeBuild
Write-Host ""
Write-Host "Starting CodeBuild..." -ForegroundColor Yellow

$buildId = aws codebuild start-build `
    --project-name $projectName `
    --source-location "s3://$bucketName/$s3Key" `
    --source-type S3 `
    --region $region `
    --query 'build.id' `
    --output text

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start CodeBuild" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build started!" -ForegroundColor Green
Write-Host ""
Write-Host "Build ID: $buildId" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitor the build:" -ForegroundColor Yellow
Write-Host "aws codebuild batch-get-builds --ids $buildId --region $region" -ForegroundColor White
Write-Host ""
Write-Host "Or view in AWS Console:" -ForegroundColor Yellow
Write-Host "https://console.aws.amazon.com/codesuite/codebuild/projects/$projectName/build/$($buildId -replace ':', '%3A')/log" -ForegroundColor White
Write-Host ""
Write-Host "Once build completes, run: npm run deploy" -ForegroundColor Yellow

