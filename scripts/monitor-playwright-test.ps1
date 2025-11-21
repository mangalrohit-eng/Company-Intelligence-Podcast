# Monitor Playwright test in Lambda
# This script starts a pipeline run and monitors logs for Playwright usage

param(
    [string]$PayloadFile = "test-tesla-full-pipeline.json"
)

$FunctionName = "pipeline-orchestrator"
$LogGroupName = "/aws/lambda/$FunctionName"

# Generate unique run ID
$runId = "test-tesla-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Update payload with unique run ID
$payload = Get-Content $PayloadFile -Raw | ConvertFrom-Json
$payload.runId = $runId
$payload | ConvertTo-Json -Depth 10 | Out-File "test-tesla-payload-$runId.json" -Encoding utf8

Write-Host "🧪 Starting Full Pipeline Test for Tesla" -ForegroundColor Cyan
Write-Host ("=" * 80)
Write-Host "Run ID: $runId" -ForegroundColor Yellow
Write-Host "HTTP Provider: $($payload.flags.provider.http)" -ForegroundColor Yellow
Write-Host ("=" * 80)
Write-Host ""

# Step 1: Invoke Lambda
Write-Host "1. Invoking Lambda function..." -ForegroundColor Yellow
$startTime = Get-Date
$startTimeUnix = [int64]((Get-Date $startTime).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds

$invokeResult = aws lambda invoke `
    --function-name $FunctionName `
    --payload "file://test-tesla-payload-$runId.json" `
    --cli-binary-format raw-in-base64-out `
    "lambda-response-$runId.json" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to invoke Lambda: $invokeResult" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Lambda invoked successfully" -ForegroundColor Green
Write-Host "   Execution started at: $($startTime.ToString('HH:mm:ss'))" -ForegroundColor Gray
Write-Host "   Monitoring logs for Playwright..." -ForegroundColor Gray
Write-Host ""

# Step 2: Monitor logs in real-time
Write-Host "2. Monitoring CloudWatch logs (checking every 10 seconds)..." -ForegroundColor Yellow
Write-Host ""

$maxWaitMinutes = 10
$checkInterval = 10
$elapsed = 0
$playwrightFound = $false
$playwrightInitialized = $false
$googleNewsFound = $false
$scrapeStarted = $false

while ($elapsed -lt ($maxWaitMinutes * 60)) {
    Start-Sleep -Seconds $checkInterval
    $elapsed += $checkInterval
    
    $currentTimeUnix = [int64]((Get-Date).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds
    
    # Check for Playwright logs
    $playwrightLogs = aws logs filter-log-events `
        --log-group-name $LogGroupName `
        --start-time $startTimeUnix `
        --end-time $currentTimeUnix `
        --filter-pattern "launchChromium OR playwright-aws-lambda OR Initialized Playwright OR Using Playwright OR PlaywrightHttpGateway" `
        --max-items 50 2>&1 | ConvertFrom-Json
    
    if ($playwrightLogs.events -and $playwrightLogs.events.Count -gt 0 -and -not $playwrightFound) {
        $playwrightFound = $true
        Write-Host "✅ Found Playwright-related logs!" -ForegroundColor Green
        $playwrightLogs.events | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
            Write-Host "   [$timestamp] $($_.message)" -ForegroundColor Cyan
            
            if ($_.message -match "Initialized Playwright|launchChromium") {
                $playwrightInitialized = $true
            }
        }
        Write-Host ""
    }
    
    # Check for Google News URLs
    $googleNewsLogs = aws logs filter-log-events `
        --log-group-name $LogGroupName `
        --start-time $startTimeUnix `
        --end-time $currentTimeUnix `
        --filter-pattern "news.google.com" `
        --max-items 20 2>&1 | ConvertFrom-Json
    
    if ($googleNewsLogs.events -and $googleNewsLogs.events.Count -gt 0 -and -not $googleNewsFound) {
        $googleNewsFound = $true
        Write-Host "✅ Found Google News URLs!" -ForegroundColor Green
        Write-Host ""
    }
    
    # Check for scrape stage
    $scrapeLogs = aws logs filter-log-events `
        --log-group-name $LogGroupName `
        --start-time $startTimeUnix `
        --end-time $currentTimeUnix `
        --filter-pattern "scrape OR Scrape" `
        --max-items 10 2>&1 | ConvertFrom-Json
    
    if ($scrapeLogs.events -and $scrapeLogs.events.Count -gt 0 -and -not $scrapeStarted) {
        $scrapeStarted = $true
        Write-Host "✅ Scrape stage started!" -ForegroundColor Green
        $scrapeLogs.events | Select-Object -Last 3 | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
            $msg = $_.message.Substring(0, [Math]::Min(150, $_.message.Length))
            Write-Host "   [$timestamp] $msg" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    # Check for errors
    $errorLogs = aws logs filter-log-events `
        --log-group-name $LogGroupName `
        --start-time $startTimeUnix `
        --end-time $currentTimeUnix `
        --filter-pattern "ERROR OR error OR Error OR failed OR Failed" `
        --max-items 10 2>&1 | ConvertFrom-Json
    
    if ($errorLogs.events) {
        $recentErrors = $errorLogs.events | Where-Object { 
            $_.timestamp -gt ($currentTimeUnix - 30000) # Last 30 seconds
        }
        if ($recentErrors) {
            Write-Host "⚠️  Recent errors found:" -ForegroundColor Yellow
            $recentErrors | ForEach-Object {
                $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
                $msg = $_.message.Substring(0, [Math]::Min(200, $_.message.Length))
                Write-Host "   [$timestamp] $msg" -ForegroundColor Red
            }
            Write-Host ""
        }
    }
    
    Write-Host "   [$(Get-Date -Format 'HH:mm:ss')] Monitoring... ($elapsed seconds elapsed)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host ("=" * 80)
Write-Host "📊 Final Status" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Playwright logs found: $(if ($playwrightFound) { '✅ Yes' } else { '❌ No' })" -ForegroundColor $(if ($playwrightFound) { 'Green' } else { 'Red' })
Write-Host "   Playwright initialized: $(if ($playwrightInitialized) { '✅ Yes' } else { '❌ No' })" -ForegroundColor $(if ($playwrightInitialized) { 'Green' } else { 'Red' })
Write-Host "   Google News URLs found: $(if ($googleNewsFound) { '✅ Yes' } else { '⚠️  No' })" -ForegroundColor $(if ($googleNewsFound) { 'Green' } else { 'Yellow' })
Write-Host "   Scrape stage started: $(if ($scrapeStarted) { '✅ Yes' } else { '❌ No' })" -ForegroundColor $(if ($scrapeStarted) { 'Green' } else { 'Red' })
Write-Host ""

# Get final logs
Write-Host "3. Retrieving final logs..." -ForegroundColor Yellow
$endTimeUnix = [int64]((Get-Date).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds

# All Playwright logs
$allPlaywrightLogs = aws logs filter-log-events `
    --log-group-name $LogGroupName `
    --start-time $startTimeUnix `
    --end-time $endTimeUnix `
    --filter-pattern "playwright OR Playwright OR launchChromium" `
    --max-items 100 2>&1 | ConvertFrom-Json

if ($allPlaywrightLogs.events) {
    Write-Host "`n📋 All Playwright logs ($($allPlaywrightLogs.events.Count) total):" -ForegroundColor Cyan
    $allPlaywrightLogs.events | ForEach-Object {
        $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
        Write-Host "   [$timestamp] $($_.message)" -ForegroundColor Gray
    }
} else {
    Write-Host "`n❌ No Playwright logs found at all!" -ForegroundColor Red
    Write-Host "   This means Playwright was never initialized." -ForegroundColor Yellow
    Write-Host "   Checking for errors..." -ForegroundColor Yellow
    
    # Check for errors
    $allErrors = aws logs filter-log-events `
        --log-group-name $LogGroupName `
        --start-time $startTimeUnix `
        --end-time $endTimeUnix `
        --filter-pattern "ERROR OR error" `
        --max-items 50 2>&1 | ConvertFrom-Json
    
    if ($allErrors.events) {
        Write-Host "`n   Errors found:" -ForegroundColor Red
        $allErrors.events | Select-Object -Last 20 | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
            $msg = $_.message.Substring(0, [Math]::Min(300, $_.message.Length))
            Write-Host "   [$timestamp] $msg" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "CloudWatch Logs URL:" -ForegroundColor Cyan
$logUrl = "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%252Faws%252Flambda%252F$FunctionName"
Write-Host $logUrl -ForegroundColor Cyan
Write-Host ""

# Cleanup
Remove-Item "test-tesla-payload-$runId.json" -ErrorAction SilentlyContinue
Remove-Item "lambda-response-$runId.json" -ErrorAction SilentlyContinue

