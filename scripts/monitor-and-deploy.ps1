# Monitor CodeBuild and deploy to ECS when complete
# Usage: .\scripts\monitor-and-deploy.ps1 <BuildId>

param (
    [Parameter(Mandatory=$true)]
    [string]$BuildId
)

$region = "us-east-1"
$clusterName = "podcast-platform-cluster"

Write-Host "Monitoring CodeBuild build: $BuildId" -ForegroundColor Cyan
Write-Host "This may take 10-15 minutes..." -ForegroundColor Yellow
Write-Host ""

$buildStatus = ""
$checkCount = 0
$maxChecks = 60  # 30 minutes max (30 seconds * 60)

while ($buildStatus -ne "SUCCEEDED" -and $buildStatus -ne "FAILED" -and $buildStatus -ne "STOPPED" -and $checkCount -lt $maxChecks) {
    Start-Sleep -Seconds 30
    $checkCount++
    
    $buildInfo = aws codebuild batch-get-builds --ids $BuildId --region $region --output json | ConvertFrom-Json
    $buildStatus = $buildInfo.builds[0].buildStatus
    
    $currentPhase = $buildInfo.builds[0].phases[0].phaseType
    $phaseStatus = $buildInfo.builds[0].phases[0].phaseStatus
    
    Write-Host "[$checkCount] Status: $buildStatus | Phase: $currentPhase | Phase Status: $phaseStatus" -ForegroundColor $(if ($buildStatus -eq "SUCCEEDED") { 'Green' } elseif ($buildStatus -eq "FAILED") { 'Red' } else { 'Yellow' })
}

if ($buildStatus -eq "SUCCEEDED") {
    Write-Host ""
    Write-Host "✅ CodeBuild succeeded! Updating ECS service..." -ForegroundColor Green
    
    # Dynamically discover the ECS service name
    Write-Host "Discovering ECS service name..." -ForegroundColor Yellow
    $ecsServiceArn = aws ecs list-services --cluster $clusterName --region $region --query "serviceArns[?contains(@, 'AppService')]" --output text
    if (-not $ecsServiceArn) {
        Write-Host "❌ Could not find ECS service in cluster $clusterName. Please check AWS Console." -ForegroundColor Red
        exit 1
    }
    $ecsServiceName = ($ecsServiceArn -split '/')[-1]
    Write-Host "Found ECS service: $ecsServiceName" -ForegroundColor Green

    Write-Host ""
    Write-Host "Updating ECS service to pull latest image..." -ForegroundColor Yellow
    aws ecs update-service `
        --cluster $clusterName `
        --service $ecsServiceName `
        --force-new-deployment `
        --region $region
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to update ECS service" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ ECS service update initiated! New deployment will roll out." -ForegroundColor Green
    Write-Host ""
    Write-Host "Monitor deployment progress:" -ForegroundColor Yellow
    Write-Host "aws ecs describe-services --cluster $clusterName --services $ecsServiceName --region $region --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' --output table" -ForegroundColor White
    Write-Host ""
    Write-Host "Get Load Balancer URL:" -ForegroundColor Yellow
    Write-Host "aws cloudformation describe-stacks --stack-name PodcastPlatformStack --region $region --query 'Stacks[0].Outputs[?OutputKey==\`AppLoadBalancerUrl\`].OutputValue' --output text" -ForegroundColor White
} elseif ($buildStatus -eq "FAILED" -or $buildStatus -eq "STOPPED") {
    Write-Host ""
    Write-Host "❌ CodeBuild failed or was stopped. Not updating ECS service." -ForegroundColor Red
    Write-Host "Check logs: https://console.aws.amazon.com/codesuite/codebuild/projects/podcast-platform-build/build/$($BuildId -replace ':', '%3A')/log" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ""
    Write-Host "⏱️ Build monitoring timeout. Please check status manually." -ForegroundColor Yellow
    Write-Host "Check status: aws codebuild batch-get-builds --ids $BuildId --region $region" -ForegroundColor White
}

