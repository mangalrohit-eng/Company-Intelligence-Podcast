# Wait for CodeBuild to complete, then update ECS service
# Usage: .\scripts\wait-and-deploy.ps1 <build-id>

param(
    [Parameter(Mandatory=$true)]
    [string]$BuildId
)

$region = "us-east-1"
$maxWaitMinutes = 20
$checkIntervalSeconds = 30
$clusterName = "podcast-platform-cluster"
$serviceName = "podcast-platform-cluster-AppService"

Write-Host "⏳ Waiting for build to complete..." -ForegroundColor Cyan
Write-Host "Build ID: $BuildId" -ForegroundColor Yellow
Write-Host "Checking every $checkIntervalSeconds seconds (max wait: $maxWaitMinutes minutes)" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
$maxWaitTime = $startTime.AddMinutes($maxWaitMinutes)

while ($true) {
    $elapsed = (Get-Date) - $startTime
    $status = aws codebuild batch-get-builds --ids $BuildId --region $region --query 'builds[0].buildStatus' --output text 2>$null
    
    if ($LASTEXITCODE -ne 0 -or -not $status) {
        Write-Host "❌ Failed to get build status" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[$($elapsed.ToString('mm\:ss'))] Build status: $status" -ForegroundColor $(if ($status -eq 'SUCCEEDED') { 'Green' } elseif ($status -eq 'FAILED') { 'Red' } else { 'Yellow' })
    
    if ($status -eq 'SUCCEEDED') {
        Write-Host ""
        Write-Host "✅ Build completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Updating ECS service to pull new image..." -ForegroundColor Cyan
        
        aws ecs update-service `
            --cluster $clusterName `
            --service $serviceName `
            --force-new-deployment `
            --region $region
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ ECS service update initiated!" -ForegroundColor Green
            Write-Host "The service will pull the new Docker image and restart containers." -ForegroundColor Gray
            Write-Host "This typically takes 2-3 minutes." -ForegroundColor Gray
            Write-Host ""
            Write-Host "Monitor service status:" -ForegroundColor Cyan
            Write-Host "aws ecs describe-services --cluster $clusterName --services $serviceName --region $region --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'" -ForegroundColor White
        } else {
            Write-Host "❌ Failed to update ECS service" -ForegroundColor Red
            exit 1
        }
        break
    }
    
    if ($status -eq 'FAILED' -or $status -eq 'STOPPED') {
        Write-Host ""
        Write-Host "❌ Build failed or stopped" -ForegroundColor Red
        Write-Host "Check logs: https://console.aws.amazon.com/codesuite/codebuild/projects/podcast-platform-build/build/$($BuildId -replace ':', '%3A')/log" -ForegroundColor Yellow
        exit 1
    }
    
    if ((Get-Date) -gt $maxWaitTime) {
        Write-Host ""
        Write-Host "⏱️  Maximum wait time exceeded" -ForegroundColor Yellow
        Write-Host "Build is still in progress. Check status manually:" -ForegroundColor Gray
        Write-Host "aws codebuild batch-get-builds --ids $BuildId --region $region" -ForegroundColor White
        exit 1
    }
    
    Start-Sleep -Seconds $checkIntervalSeconds
}

