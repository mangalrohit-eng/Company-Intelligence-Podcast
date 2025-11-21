# PowerShell script to test full pipeline for Tesla with Playwright
# This will test discover + scrape stages in Lambda

$FunctionName = "pipeline-orchestrator"
$LogGroupName = "/aws/lambda/$FunctionName"
$PayloadFile = "test-tesla-pipeline.json"

Write-Host "🧪 Testing Full Pipeline for Tesla with Playwright" -ForegroundColor Cyan
Write-Host ("=" * 80)
Write-Host ""

# Step 1: Verify payload file exists
if (-not (Test-Path $PayloadFile)) {
    Write-Host "❌ Payload file not found: $PayloadFile" -ForegroundColor Red
    exit 1
}

Write-Host "1. Payload file found: $PayloadFile" -ForegroundColor Green
$payload = Get-Content $PayloadFile | ConvertFrom-Json
Write-Host "   Company: $($payload.config.companyName)" -ForegroundColor Gray
Write-Host "   Stages enabled: discover=$($payload.flags.enable.discover), scrape=$($payload.flags.enable.scrape)" -ForegroundColor Gray
Write-Host "   HTTP Provider: $($payload.flags.provider.http)" -ForegroundColor Gray
Write-Host ""

# Step 2: Invoke Lambda
Write-Host "2. Invoking Lambda function..." -ForegroundColor Yellow
Write-Host "   Function: $FunctionName" -ForegroundColor Gray
Write-Host "   This may take 2-5 minutes..." -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
$invokeResult = aws lambda invoke `
    --function-name $FunctionName `
    --payload "file://$PayloadFile" `
    --cli-binary-format raw-in-base64-out `
    "lambda-response-tesla.json" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to invoke Lambda: $invokeResult" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Lambda invoked successfully" -ForegroundColor Green
Write-Host "   Waiting for execution to complete..." -ForegroundColor Gray
Write-Host ""

# Step 3: Wait for execution
Start-Sleep -Seconds 30
Write-Host "3. Checking Lambda response..." -ForegroundColor Yellow

if (Test-Path "lambda-response-tesla.json") {
    $response = Get-Content "lambda-response-tesla.json" | ConvertFrom-Json
    
    if ($response.errorMessage) {
        Write-Host "❌ Lambda error: $($response.errorMessage)" -ForegroundColor Red
        if ($response.stackTrace) {
            Write-Host "Stack trace (first 500 chars):" -ForegroundColor Red
            Write-Host $response.stackTrace.Substring(0, [Math]::Min(500, $response.stackTrace.Length)) -ForegroundColor Gray
        }
    } else {
        Write-Host "✅ Lambda execution completed" -ForegroundColor Green
        if ($response.result) {
            Write-Host "   Status: $($response.result.status)" -ForegroundColor Gray
            if ($response.result.telemetry) {
                Write-Host "   Duration: $($response.result.telemetry.durationSeconds) seconds" -ForegroundColor Gray
                if ($response.result.telemetry.stages) {
                    $stages = $response.result.telemetry.stages | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name
                    Write-Host "   Stages executed: $($stages -join ', ')" -ForegroundColor Gray
                }
            }
        }
    }
} else {
    Write-Host "⚠️  Response file not found" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Wait for logs to appear
Write-Host "4. Waiting for CloudWatch logs (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15
Write-Host ""

# Step 5: Check CloudWatch logs for Playwright
Write-Host "5. Checking CloudWatch logs for Playwright initialization..." -ForegroundColor Yellow
Write-Host ""

$startTimeUnix = [int64]((Get-Date $startTime).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds
$endTimeUnix = [int64]((Get-Date).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds

# Check for Playwright logs
$playwrightLogs = aws logs filter-log-events `
    --log-group-name $LogGroupName `
    --start-time $startTimeUnix `
    --end-time $endTimeUnix `
    --filter-pattern "launchChromium OR playwright-aws-lambda OR Initialized Playwright OR Using Playwright" `
    --max-items 50 2>&1 | ConvertFrom-Json

if ($playwrightLogs.events -and $playwrightLogs.events.Count -gt 0) {
    Write-Host "✅ Found $($playwrightLogs.events.Count) Playwright-related log entries:" -ForegroundColor Green
    Write-Host ""
    
    $playwrightLogs.events | ForEach-Object {
        $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
        $message = $_.message
        Write-Host "   [$timestamp] $message" -ForegroundColor Cyan
    }
    Write-Host ""
    
    # Check for success indicators
    $hasInitialized = $playwrightLogs.events | Where-Object { 
        $_.message -match "Initialized Playwright|launchChromium" 
    }
    
    if ($hasInitialized) {
        Write-Host "✅ SUCCESS: Playwright initialized successfully in Lambda!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Playwright logs found but no initialization confirmation" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No Playwright-specific logs found" -ForegroundColor Yellow
    Write-Host "   Checking for scrape stage logs..." -ForegroundColor Gray
    
    # Check for scrape logs
    $scrapeLogs = aws logs filter-log-events `
        --log-group-name $LogGroupName `
        --start-time $startTimeUnix `
        --end-time $endTimeUnix `
        --filter-pattern "scrape OR Scrape" `
        --max-items 30 2>&1 | ConvertFrom-Json
    
    if ($scrapeLogs.events) {
        Write-Host "   Found $($scrapeLogs.events.Count) scrape-related logs:" -ForegroundColor Gray
        $scrapeLogs.events | Select-Object -Last 10 | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
            $msg = $_.message.Substring(0, [Math]::Min(150, $_.message.Length))
            Write-Host "   [$timestamp] $msg" -ForegroundColor Gray
        }
    }
}
Write-Host ""

# Step 6: Check for Google News URLs and content
Write-Host "6. Checking for Google News URL scraping..." -ForegroundColor Yellow

$googleNewsLogs = aws logs filter-log-events `
    --log-group-name $LogGroupName `
    --start-time $startTimeUnix `
    --end-time $endTimeUnix `
    --filter-pattern "news.google.com OR Google News" `
    --max-items 30 2>&1 | ConvertFrom-Json

if ($googleNewsLogs.events) {
    Write-Host "✅ Found $($googleNewsLogs.events.Count) Google News-related logs:" -ForegroundColor Green
    Write-Host ""
    
    $googleNewsLogs.events | Select-Object -First 10 | ForEach-Object {
        $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
        $message = $_.message
        Write-Host "   [$timestamp] $message" -ForegroundColor Cyan
    }
    
    # Check for content length indicators
    $contentLogs = $googleNewsLogs.events | Where-Object { 
        $_.message -match "contentLength|bodyLength|content length" 
    }
    
    if ($contentLogs) {
        Write-Host ""
        Write-Host "📊 Content length indicators:" -ForegroundColor Cyan
        $contentLogs | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
            Write-Host "   [$timestamp] $($_.message)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "⚠️  No Google News URLs found in logs" -ForegroundColor Yellow
    Write-Host "   This may mean discover stage did not find Google News URLs" -ForegroundColor Gray
}
Write-Host ""

# Step 7: Summary
Write-Host ("=" * 80)
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host ""

$summary = @{
    "Lambda Invoked" = if ($LASTEXITCODE -eq 0) { "✅ Yes" } else { "❌ No" }
    "Playwright Logs" = if ($playwrightLogs.events) { "✅ Found $($playwrightLogs.events.Count)" } else { "⚠️  Not found" }
    "Google News URLs" = if ($googleNewsLogs.events) { "✅ Found $($googleNewsLogs.events.Count)" } else { "⚠️  Not found" }
    "Playwright Initialized" = if ($hasInitialized) { "✅ Yes" } else { "⚠️  Unknown" }
}

$summary.GetEnumerator() | ForEach-Object {
    Write-Host "   $($_.Key): $($_.Value)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "✅ Test completed!" -ForegroundColor Green
Write-Host ""
Write-Host "To view full logs, check CloudWatch:" -ForegroundColor Cyan
$logUrl = "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%252Faws%252Flambda%252F" + $FunctionName
Write-Host $logUrl -ForegroundColor Cyan
Write-Host ""

# Cleanup
Remove-Item "lambda-response-tesla.json" -ErrorAction SilentlyContinue

