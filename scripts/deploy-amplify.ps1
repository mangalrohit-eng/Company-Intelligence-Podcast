# PowerShell script to deploy Next.js app to AWS Amplify
# This script prepares the project and provides instructions for Console deployment

param(
    [string]$ApiUrl = "",
    [string]$CognitoUserPoolId = "",
    [string]$CognitoClientId = ""
)

Write-Host "AWS Amplify Deployment Setup" -ForegroundColor Green
Write-Host ""

# Step 1: Get AWS Account Info
Write-Host "Step 1: Getting AWS Account Info..." -ForegroundColor Cyan
try {
    $accountId = aws sts get-caller-identity --query Account --output text
    $region = aws configure get region
    if (-not $region) {
        $region = "us-east-1"
    }
    Write-Host "[OK] Account ID: $accountId" -ForegroundColor Green
    Write-Host "[OK] Region: $region" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to get AWS account info. Is AWS CLI configured?" -ForegroundColor Red
    exit 1
}

# Step 2: Get CloudFormation stack outputs
Write-Host "`nStep 2: Getting backend configuration..." -ForegroundColor Cyan
try {
    $stackName = "PodcastPlatformStack"
    
    if (-not $ApiUrl) {
        $ApiUrl = aws cloudformation describe-stacks `
            --stack-name $stackName `
            --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
            --output text `
            --region $region 2>$null
    }
    
    if (-not $CognitoUserPoolId) {
        $CognitoUserPoolId = aws cloudformation describe-stacks `
            --stack-name $stackName `
            --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" `
            --output text `
            --region $region 2>$null
    }
    
    if (-not $CognitoClientId) {
        $CognitoClientId = aws cloudformation describe-stacks `
            --stack-name $stackName `
            --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" `
            --output text `
            --region $region 2>$null
    }
    
    Write-Host "[OK] API URL: $ApiUrl" -ForegroundColor Green
    Write-Host "[OK] Cognito User Pool ID: $CognitoUserPoolId" -ForegroundColor Green
    Write-Host "[OK] Cognito Client ID: $CognitoClientId" -ForegroundColor Green
    
    if (-not $ApiUrl -or -not $CognitoUserPoolId -or -not $CognitoClientId) {
        Write-Host "[WARNING] Some values are missing. Make sure the CDK stack is deployed first." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Could not get stack outputs. Continuing with provided values..." -ForegroundColor Yellow
}

# Step 3: Verify amplify.yml exists
Write-Host "`nStep 3: Checking amplify.yml..." -ForegroundColor Cyan
if (Test-Path "amplify.yml") {
    Write-Host "[OK] amplify.yml found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] amplify.yml not found!" -ForegroundColor Red
    exit 1
}

# Step 4: Display deployment instructions
Write-Host "`n" -ForegroundColor Green
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "AWS AMPLIFY CONSOLE DEPLOYMENT INSTRUCTIONS" -ForegroundColor Yellow
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 1: Deploy via AWS Console (Recommended)" -ForegroundColor Green
Write-Host ""
Write-Host "1. Go to AWS Amplify Console:" -ForegroundColor White
Write-Host "   https://console.aws.amazon.com/amplify/home?region=$region" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Click 'New app' → 'Host web app'" -ForegroundColor White
Write-Host ""
Write-Host "3. Connect your Git repository:" -ForegroundColor White
Write-Host "   - Select your Git provider (GitHub, GitLab, Bitbucket)" -ForegroundColor Gray
Write-Host "   - Authorize AWS Amplify" -ForegroundColor Gray
Write-Host "   - Select your repository" -ForegroundColor Gray
Write-Host "   - Select branch (usually 'main' or 'master')" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Configure build settings (Amplify auto-detects Next.js):" -ForegroundColor White
Write-Host "   - Build command: npm run build" -ForegroundColor Gray
Write-Host "   - Output directory: .next" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Add environment variables:" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_API_URL = $ApiUrl" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_COGNITO_USER_POOL_ID = $CognitoUserPoolId" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_COGNITO_CLIENT_ID = $CognitoClientId" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_AWS_REGION = $region" -ForegroundColor Gray
Write-Host "   NEXT_DISABLE_ESLINT = true" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Click 'Save and deploy'" -ForegroundColor White
Write-Host "   - Amplify will build and deploy your app" -ForegroundColor Gray
Write-Host "   - First deployment takes ~5-10 minutes" -ForegroundColor Gray
Write-Host ""
Write-Host "7. After deployment, you'll get a URL like:" -ForegroundColor White
Write-Host "   https://main.xxxxxxxxxxxx.amplifyapp.com" -ForegroundColor Cyan
Write-Host ""

Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 2: Deploy via Amplify CLI (Alternative)" -ForegroundColor Green
Write-Host ""
Write-Host "Run these commands:" -ForegroundColor White
Write-Host "  amplify init" -ForegroundColor Cyan
Write-Host "  amplify add hosting" -ForegroundColor Cyan
Write-Host "  amplify publish" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: CLI approach requires interactive setup" -ForegroundColor Yellow
Write-Host ""

Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

Write-Host "Environment Variables Summary:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Copy these to AWS Amplify Console → App Settings → Environment variables:" -ForegroundColor White
Write-Host ""
Write-Host "NEXT_PUBLIC_API_URL=$ApiUrl" -ForegroundColor Cyan
Write-Host "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$CognitoUserPoolId" -ForegroundColor Cyan
Write-Host "NEXT_PUBLIC_COGNITO_CLIENT_ID=$CognitoClientId" -ForegroundColor Cyan
Write-Host "NEXT_PUBLIC_AWS_REGION=$region" -ForegroundColor Cyan
Write-Host "NEXT_DISABLE_ESLINT=true" -ForegroundColor Cyan
Write-Host ""

Write-Host "[SUCCESS] Setup complete! Follow the instructions above to deploy." -ForegroundColor Green
Write-Host ""

