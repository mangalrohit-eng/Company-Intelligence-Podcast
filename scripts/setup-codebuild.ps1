# Setup AWS CodeBuild project for building Docker images
# Usage: .\scripts\setup-codebuild.ps1

Write-Host "Setting up AWS CodeBuild for Docker builds..." -ForegroundColor Cyan

# Get AWS account ID
Write-Host ""
Write-Host "Getting AWS account ID..." -ForegroundColor Yellow
$accountId = aws sts get-caller-identity --query Account --output text
if (-not $accountId) {
    Write-Host "Failed to get AWS account ID. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}
Write-Host "Account ID: $accountId" -ForegroundColor Green

$region = "us-east-1"
$repoName = "podcast-platform-app"
$projectName = "podcast-platform-build"

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

# Get ECR repository URI
$ecrUri = "$accountId.dkr.ecr.$region.amazonaws.com/$repoName"

# Create IAM role for CodeBuild
Write-Host ""
Write-Host "Creating IAM role for CodeBuild..." -ForegroundColor Yellow

$trustPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Principal = @{
                Service = "codebuild.amazonaws.com"
            }
            Action = "sts:AssumeRole"
        }
    )
} | ConvertTo-Json -Depth 10

$roleName = "codebuild-$projectName-role"
$roleExists = aws iam get-role --role-name $roleName 2>$null

if (-not $roleExists) {
    Write-Host "Creating IAM role: $roleName" -ForegroundColor Yellow
    aws iam create-role --role-name $roleName --assume-role-policy-document $trustPolicy
    Start-Sleep -Seconds 2
    
    # Attach policies
    Write-Host "Attaching policies..." -ForegroundColor Yellow
    aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
    aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser
    aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
    
    Write-Host "IAM role created" -ForegroundColor Green
} else {
    Write-Host "IAM role exists" -ForegroundColor Green
}

$roleArn = "arn:aws:iam::${accountId}:role/${roleName}"

# Create CodeBuild project
Write-Host ""
Write-Host "Creating CodeBuild project..." -ForegroundColor Yellow

# Create project config JSON manually (CodeBuild CLI is finicky with nested JSON)
$projectConfigJson = @"
{
  "name": "$projectName",
  "description": "Build Docker image for podcast platform app",
  "source": {
    "type": "S3",
    "location": "podcast-platform-source-bucket-$accountId/source.zip"
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:7.0",
    "computeType": "BUILD_GENERAL1_MEDIUM",
    "privilegedMode": true,
    "environmentVariables": [
      {
        "name": "ACCOUNT_ID",
        "value": "$accountId"
      },
      {
        "name": "REPO_NAME",
        "value": "$repoName"
      },
      {
        "name": "AWS_DEFAULT_REGION",
        "value": "$region"
      }
    ]
  },
  "serviceRole": "$roleArn"
}
"@

$projectConfigFile = "codebuild-project.json"
$projectConfigJson | Out-File -FilePath $projectConfigFile -Encoding utf8 -NoNewline

$projectExists = aws codebuild list-projects --region $region --query "projects[?contains(@, '$projectName')]" --output text

if ($projectExists) {
    Write-Host "Updating CodeBuild project..." -ForegroundColor Yellow
    aws codebuild update-project --cli-input-json "file://$projectConfigFile" --region $region
} else {
    Write-Host "Creating CodeBuild project..." -ForegroundColor Yellow
    aws codebuild create-project --cli-input-json "file://$projectConfigFile" --region $region
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create/update CodeBuild project" -ForegroundColor Red
    Write-Host "You may need to create it manually in the AWS Console" -ForegroundColor Yellow
    Write-Host "Config saved to: $projectConfigFile" -ForegroundColor Yellow
    exit 1
}

Remove-Item $projectConfigFile -ErrorAction SilentlyContinue
Write-Host "CodeBuild project ready" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create a source zip file: .\scripts\prepare-codebuild-source.ps1" -ForegroundColor White
Write-Host "2. Upload to S3 and trigger build: .\scripts\trigger-codebuild.ps1" -ForegroundColor White
Write-Host "3. Or use the manual commands in DEPLOY_WITHOUT_DOCKER.md" -ForegroundColor White

