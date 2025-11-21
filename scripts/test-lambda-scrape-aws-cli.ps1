# PowerShell script to test Lambda scrape stage
# This invokes the Lambda function and checks CloudWatch logs

param(
    [string]$Url = "https://news.google.com/rss/articles/CBMiuAFBVV95cUxQRkdGbldZT01Ca1oyZFhybWgzYUlTU2RMUEJMVy1ybzh1M1E3S3NHNnN4d0tNVVhXNENDaWRIb0oySjZUeVNrdWNIclBfX0NKazZzNjIzQk9wS0V6ZjdNU2p1bjRBOG5BMlJadW5rTHBTN01CeXhyQldxNFlGcWE2RGx1Z3p0cmJhQjZPamN0bFh4aGxFVDBkVEdKYlUtZ2cxYTNQYlM4bW9WUm4wYzlyZEFmeUg1TTRN?oc=5"
)

$FunctionName = "pipeline-orchestrator"
$LogGroupName = "/aws/lambda/$FunctionName"

Write-Host "🧪 Testing Scrape Stage in Lambda" -ForegroundColor Cyan
Write-Host ("=" * 80)
Write-Host "Test URL: $Url"
Write-Host ("=" * 80)
Write-Host ""

# Step 1: Prepare test payload
Write-Host "1. Preparing test payload..." -ForegroundColor Yellow
$runId = "test-scrape-$(Get-Date -Format 'yyyyMMddHHmmss')"
$payload = @{
    runId = $runId
    podcastId = "test-podcast"
    configVersion = 1
    config = @{
        companyId = "Test Company"
        industry = "Technology"
        competitors = @()
        durationMinutes = 5
        voice = "onyx"
        version = 1
    }
    flags = @{
        enable = @{
            prepare = $false
            discover = $false
            scrape = $true
            extract = $false
            summarize = $false
            contrast = $false
            outline = $false
            script = $false
            qa = $false
            tts = $false
            package = $false
        }
        provider = @{
            llm = "openai"
            tts = "openai"
            http = "playwright"
        }
        cassetteKey = "default"
        dryRun = $false
    }
} | ConvertTo-Json -Depth 10

$payloadFile = "test-payload-$runId.json"
$payload | Out-File -FilePath $payloadFile -Encoding utf8
Write-Host "✅ Payload saved to $payloadFile" -ForegroundColor Green
Write-Host ""

# Step 2: Invoke Lambda
Write-Host "2. Invoking Lambda function..." -ForegroundColor Yellow
Write-Host "   Function: $FunctionName" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
$invokeResult = aws lambda invoke `
    --function-name $FunctionName `
    --payload "file://$payloadFile" `
    --cli-binary-format raw-in-base64-out `
    "lambda-response-$runId.json" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Lambda invoked successfully" -ForegroundColor Green
    
    # Read response
    $response = Get-Content "lambda-response-$runId.json" | ConvertFrom-Json
    if ($response.errorMessage) {
        Write-Host "❌ Lambda error: $($response.errorMessage)" -ForegroundColor Red
        if ($response.stackTrace) {
            Write-Host "Stack trace: $($response.stackTrace)" -ForegroundColor Red
        }
    } else {
        Write-Host "✅ Lambda response received" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Failed to invoke Lambda: $invokeResult" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Wait for logs
Write-Host "3. Waiting for CloudWatch logs (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host ""

# Step 4: Check CloudWatch logs
Write-Host "4. Checking CloudWatch logs for Playwright initialization..." -ForegroundColor Yellow
Write-Host ""

$startTimeUnix = [int64]((Get-Date $startTime).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds
$endTimeUnix = [int64]((Get-Date).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds

$logEvents = aws logs filter-log-events `
    --log-group-name $LogGroupName `
    --start-time $startTimeUnix `
    --end-time $endTimeUnix `
    --filter-pattern "launchChromium OR playwright-aws-lambda OR Playwright OR scrape" `
    --max-items 50 2>&1 | ConvertFrom-Json

if ($logEvents.events) {
    Write-Host "✅ Found $($logEvents.events.Count) relevant log entries:" -ForegroundColor Green
    Write-Host ""
    
    $playwrightLogs = $logEvents.events | Where-Object { 
        $_.message -match "launchChromium|playwright-aws-lambda|Initialized Playwright|Playwright" 
    }
    
    if ($playwrightLogs) {
        Write-Host "📋 Playwright-related logs:" -ForegroundColor Cyan
        $playwrightLogs | Select-Object -First 10 | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("yyyy-MM-dd HH:mm:ss")
            Write-Host "   [$timestamp] $($_.message)" -ForegroundColor Gray
        }
        Write-Host ""
        
        $hasLaunchChromium = $playwrightLogs | Where-Object { 
            $_.message -match "launchChromium|Initialized Playwright" 
        }
        
        if ($hasLaunchChromium) {
            Write-Host "✅ SUCCESS: Playwright initialized successfully in Lambda!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  WARNING: Playwright logs found but no initialization confirmation" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  No Playwright-specific logs found" -ForegroundColor Yellow
        Write-Host "   Showing all relevant logs:" -ForegroundColor Gray
        $logEvents.events | Select-Object -First 10 | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("yyyy-MM-dd HH:mm:ss")
            Write-Host "   [$timestamp] $($_.message)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "⚠️  No relevant logs found" -ForegroundColor Yellow
    Write-Host "   Logs may not be available yet, or the function may not have executed" -ForegroundColor Gray
    $manualLogUrl = 'https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%252Faws%252Flambda%252F' + $FunctionName
    Write-Host "   Check manually: $manualLogUrl" -ForegroundColor Cyan
}
Write-Host ""

# Cleanup
Remove-Item $payloadFile -ErrorAction SilentlyContinue
Remove-Item "lambda-response-$runId.json" -ErrorAction SilentlyContinue

Write-Host ("=" * 80)
Write-Host "✅ Test completed!" -ForegroundColor Green
Write-Host ""
Write-Host "To view full logs, check CloudWatch:" -ForegroundColor Cyan
$logUrl = 'https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%252Faws%252Flambda%252F' + $FunctionName
Write-Host $logUrl -ForegroundColor Cyan

