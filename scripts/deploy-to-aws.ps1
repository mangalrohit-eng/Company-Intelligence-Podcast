# PowerShell script to deploy Next.js app to AWS
# This script builds the app and syncs to S3/CloudFront

param(
    [string]$ApiUrl = "",
    [string]$CognitoUserPoolId = "",
    [string]$CognitoClientId = ""
)

Write-Host "Starting AWS Deployment..." -ForegroundColor Green

# Step 1: Check AWS CLI
Write-Host "`nStep 1: Checking AWS CLI..." -ForegroundColor Cyan
try {
    $awsVersion = aws --version
    Write-Host "[OK] AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] AWS CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "   Download from: https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor Yellow
    exit 1
}

# Step 2: Get AWS Account ID and Region
Write-Host "`nStep 2: Getting AWS Account Info..." -ForegroundColor Cyan
try {
    $accountId = aws sts get-caller-identity --query Account --output text
    $region = aws configure get region
    if (-not $region) {
        $region = "us-east-1"
        Write-Host "[WARNING] No region configured, using default: $region" -ForegroundColor Yellow
    }
    Write-Host "[OK] Account ID: $accountId" -ForegroundColor Green
    Write-Host "[OK] Region: $region" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to get AWS account info. Is AWS CLI configured?" -ForegroundColor Red
    Write-Host "   Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Step 3: Get CloudFormation stack outputs
Write-Host "`nStep 3: Getting deployment info from CloudFormation..." -ForegroundColor Cyan
try {
    $stackName = "PodcastPlatformStack"
    
    # Get API URL
    if (-not $ApiUrl) {
        $ApiUrl = aws cloudformation describe-stacks `
            --stack-name $stackName `
            --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
            --output text `
            --region $region 2>$null
    }
    
    # Get Cognito User Pool ID
    if (-not $CognitoUserPoolId) {
        $CognitoUserPoolId = aws cloudformation describe-stacks `
            --stack-name $stackName `
            --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" `
            --output text `
            --region $region 2>$null
    }
    
    # Get Cognito Client ID
    if (-not $CognitoClientId) {
        $CognitoClientId = aws cloudformation describe-stacks `
            --stack-name $stackName `
            --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" `
            --output text `
            --region $region 2>$null
    }
    
    # Get Frontend Bucket
    $frontendBucket = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" `
        --output text `
        --region $region 2>$null
    
    # Get CloudFront Distribution ID
    $distributionId = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --query "Stacks[0].Outputs[?OutputKey=='DistributionDomain'].OutputValue" `
        --output text `
        --region $region 2>$null
    
    if ($distributionId) {
        $distributionId = $distributionId -replace 'https://', '' -replace '.cloudfront.net', ''
    }
    
    Write-Host "[OK] API URL: $ApiUrl" -ForegroundColor Green
    Write-Host "[OK] Cognito User Pool ID: $CognitoUserPoolId" -ForegroundColor Green
    Write-Host "[OK] Cognito Client ID: $CognitoClientId" -ForegroundColor Green
    Write-Host "[OK] Frontend Bucket: $frontendBucket" -ForegroundColor Green
    Write-Host "[OK] CloudFront Distribution: $distributionId" -ForegroundColor Green
    
    if (-not $ApiUrl -or -not $CognitoUserPoolId -or -not $CognitoClientId -or -not $frontendBucket) {
        Write-Host "[WARNING] Some values are missing. Make sure the CDK stack is deployed first." -ForegroundColor Yellow
        Write-Host "   Run: npm run deploy" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Could not get stack outputs. Continuing with provided values..." -ForegroundColor Yellow
}

# Step 4: Build Next.js app
Write-Host "`nStep 4: Building Next.js application..." -ForegroundColor Cyan

# Set environment variables for the build (PowerShell syntax)
if ($ApiUrl) {
    $env:NEXT_PUBLIC_API_URL = $ApiUrl
}
if ($CognitoUserPoolId) {
    $env:NEXT_PUBLIC_COGNITO_USER_POOL_ID = $CognitoUserPoolId
}
if ($CognitoClientId) {
    $env:NEXT_PUBLIC_COGNITO_CLIENT_ID = $CognitoClientId
}
$env:NODE_ENV = "production"
$env:NEXT_DISABLE_ESLINT = "true"

# Run next build directly (environment variables are already set)
npx next build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Build successful!" -ForegroundColor Green

# Step 5: Sync to S3
Write-Host "`nStep 5: Syncing to S3..." -ForegroundColor Cyan
if ($frontendBucket) {
    # Next.js static export creates an 'out' directory
    if (Test-Path "out") {
        Write-Host "   Syncing out/ directory to s3://$frontendBucket/..." -ForegroundColor Gray
        aws s3 sync out s3://$frontendBucket/ --delete --region $region
    } else {
        Write-Host "[ERROR] Build output directory 'out' not found." -ForegroundColor Red
        Write-Host "   Make sure Next.js is configured with 'output: export' in next.config.mjs" -ForegroundColor Yellow
        exit 1
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] S3 sync failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[OK] Files synced to S3!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Frontend bucket not found. Skipping S3 sync." -ForegroundColor Yellow
}

# Step 6: Invalidate CloudFront cache
Write-Host "`nStep 6: Invalidating CloudFront cache..." -ForegroundColor Cyan
if ($distributionId) {
    $invalidationId = aws cloudfront create-invalidation `
        --distribution-id $distributionId `
        --paths "/*" `
        --region $region `
        --query "Invalidation.Id" `
        --output text
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] CloudFront invalidation created: $invalidationId" -ForegroundColor Green
        Write-Host "   Cache will be cleared in 1-2 minutes." -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] CloudFront invalidation failed, but deployment may still work." -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] CloudFront distribution ID not found. Skipping cache invalidation." -ForegroundColor Yellow
}

# Step 7: Summary
Write-Host "`n[SUCCESS] Deployment Complete!" -ForegroundColor Green
Write-Host "`nDeployment Summary:" -ForegroundColor Cyan
Write-Host "   API URL: $ApiUrl" -ForegroundColor White
Write-Host "   Cognito User Pool: $CognitoUserPoolId" -ForegroundColor White
Write-Host "   Cognito Client: $CognitoClientId" -ForegroundColor White
if ($distributionId) {
    $cloudfrontUrl = "https://$distributionId.cloudfront.net"
    Write-Host "   CloudFront URL: $cloudfrontUrl" -ForegroundColor White
    Write-Host "`nYour app is available at: $cloudfrontUrl" -ForegroundColor Green
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "   1. Wait 1-2 minutes for CloudFront cache to clear" -ForegroundColor White
Write-Host "   2. Visit your CloudFront URL to test the app" -ForegroundColor White
Write-Host "   3. Check AWS Console for any errors" -ForegroundColor White
Write-Host "`n[NOTE] Production build artifacts remain in .next/ directory" -ForegroundColor Yellow
Write-Host "   To resume local development, run: npm run clean" -ForegroundColor Yellow
Write-Host "   Or manually delete the .next/ directory" -ForegroundColor Yellow

