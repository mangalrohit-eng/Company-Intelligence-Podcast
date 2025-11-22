# Iterative build and fix script
# Runs builds, checks CloudWatch logs, fixes issues, and repeats until success

param(
    [int]$MaxIterations = 10,
    [int]$WaitAfterFailure = 30
)

$projectName = "podcast-platform-build"
$region = "us-east-1"
$logGroup = "/aws/codebuild/$projectName"
$iteration = 0

Write-Host "Starting iterative build and fix process..." -ForegroundColor Cyan
Write-Host "Max iterations: $MaxIterations" -ForegroundColor Yellow
Write-Host ""

while ($iteration -lt $MaxIterations) {
    $iteration++
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Iteration $iteration" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Step 1: Prepare source
    Write-Host "`n[1/5] Preparing source code..." -ForegroundColor Yellow
    & ".\scripts\prepare-codebuild-source-fixed.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to prepare source" -ForegroundColor Red
        break
    }
    
    # Step 2: Upload to S3
    Write-Host "`n[2/5] Uploading to S3..." -ForegroundColor Yellow
    aws s3 cp source.zip "s3://podcast-platform-source-bucket-098478926952/source.zip" --region $region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to upload to S3" -ForegroundColor Red
        break
    }
    
    # Step 3: Start build
    Write-Host "`n[3/5] Starting build..." -ForegroundColor Yellow
    $buildId = aws codebuild start-build --project-name $projectName --region $region --query 'build.id' --output text
    if (-not $buildId) {
        Write-Host "❌ Failed to start build" -ForegroundColor Red
        break
    }
    Write-Host "Build ID: $buildId" -ForegroundColor Cyan
    
    # Step 4: Wait for build to complete
    Write-Host "`n[4/5] Waiting for build to complete..." -ForegroundColor Yellow
    $status = "IN_PROGRESS"
    $waitTime = 0
    $maxWaitTime = 600  # 10 minutes max
    
    while ($status -eq "IN_PROGRESS" -and $waitTime -lt $maxWaitTime) {
        Start-Sleep -Seconds 10
        $waitTime += 10
        $status = aws codebuild batch-get-builds --ids $buildId --region $region --query 'builds[0].buildStatus' --output text
        if ($waitTime % 30 -eq 0) {
            Write-Host "  Status: $status (waited $waitTime seconds)" -ForegroundColor Gray
        }
    }
    
    # Step 5: Check build status and logs
    Write-Host "`n[5/5] Checking build status and logs..." -ForegroundColor Yellow
    $finalStatus = aws codebuild batch-get-builds --ids $buildId --region $region --query 'builds[0].buildStatus' --output text
    
    if ($finalStatus -eq "SUCCEEDED") {
        Write-Host "`n✅ BUILD SUCCEEDED!" -ForegroundColor Green
        Write-Host "Build ID: $buildId" -ForegroundColor Cyan
        break
    }
    
    Write-Host "`n❌ Build failed with status: $finalStatus" -ForegroundColor Red
    Write-Host "Waiting $WaitAfterFailure seconds before checking logs..." -ForegroundColor Yellow
    Start-Sleep -Seconds $WaitAfterFailure
    
    # Get recent logs
    Write-Host "`nFetching CloudWatch logs..." -ForegroundColor Yellow
    $logs = aws logs tail $logGroup --region $region --since 10m --format short 2>&1 | Select-Object -Last 200
    
    # Look for common errors
    $errorFound = $false
    
    # Check for directory not found errors
    if ($logs -match "/src.*not found" -or $logs -match "/containers.*not found" -or $logs -match "/scripts.*not found") {
        Write-Host "`n🔍 Error: Directories not found in zip file" -ForegroundColor Red
        Write-Host "This should be fixed by the forward-slash zip script" -ForegroundColor Yellow
        $errorFound = $true
    }
    
    # Check for TypeScript errors
    if ($logs -match "Type error" -or $logs -match "Failed to compile") {
        Write-Host "`n🔍 Error: TypeScript compilation error" -ForegroundColor Red
        $tsError = $logs | Select-String -Pattern "Type error|Failed to compile" -Context 5,10
        Write-Host $tsError -ForegroundColor Yellow
        $errorFound = $true
        
        # Try to extract the specific error
        $errorLine = $logs | Select-String -Pattern "\.ts:\d+:\d+" | Select-Object -First 1
        if ($errorLine) {
            Write-Host "`nError location: $errorLine" -ForegroundColor Yellow
        }
    }
    
    # Check for Docker build errors
    if ($logs -match "ERROR:" -or $logs -match "failed to solve") {
        Write-Host "`n🔍 Error: Docker build error" -ForegroundColor Red
        $dockerError = $logs | Select-String -Pattern "ERROR:|failed to solve" -Context 3,5 | Select-Object -First 3
        Write-Host $dockerError -ForegroundColor Yellow
        $errorFound = $true
    }
    
    # Check for npm/build errors
    if ($logs -match "npm.*error" -or $logs -match "build.*error" -i) {
        Write-Host "`n🔍 Error: npm/build error" -ForegroundColor Red
        $npmError = $logs | Select-String -Pattern "npm.*error|build.*error" -Context 3,5 | Select-Object -First 3
        Write-Host $npmError -ForegroundColor Yellow
        $errorFound = $true
    }
    
    if (-not $errorFound) {
        Write-Host "`n⚠️  No specific errors detected in logs. Showing recent log output:" -ForegroundColor Yellow
        $logs | Select-Object -Last 50
    }
    
    Write-Host "`nContinuing to next iteration..." -ForegroundColor Cyan
    Write-Host ""
}

if ($iteration -ge $MaxIterations) {
    Write-Host "`n⚠️  Reached maximum iterations ($MaxIterations)" -ForegroundColor Yellow
}

Write-Host "`nProcess complete." -ForegroundColor Cyan

