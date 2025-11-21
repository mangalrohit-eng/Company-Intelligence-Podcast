# Analyze a specific run for Playwright issues
param(
    [Parameter(Mandatory=$true)]
    [string]$RunId
)

$LogGroupName = "/aws/lambda/pipeline-orchestrator"

Write-Host "🔍 Analyzing Run for Playwright Issues" -ForegroundColor Cyan
Write-Host ("=" * 80)
Write-Host "Run ID: $RunId" -ForegroundColor Yellow
Write-Host ("=" * 80)
Write-Host ""

# Get run start time from DynamoDB
Write-Host "1. Getting run details..." -ForegroundColor Yellow
$run = aws dynamodb get-item `
    --table-name runs `
    --key "{\"id\":{\"S\":\"$RunId\"}}" `
    2>&1 | ConvertFrom-Json

if (-not $run.Item) {
    Write-Host "❌ Run not found!" -ForegroundColor Red
    exit 1
}

$startedAt = $run.Item.startedAt.S
if ($startedAt) {
    $startTime = [DateTime]::Parse($startedAt)
    Write-Host "✅ Run started at: $startTime" -ForegroundColor Green
} else {
    Write-Host "⚠️  No start time found, checking last 30 minutes" -ForegroundColor Yellow
    $startTime = (Get-Date).AddMinutes(-30)
}
Write-Host ""

# Calculate time range
$startTimeUnix = [int64]($startTime.ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds
$endTimeUnix = [int64]((Get-Date).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds

# Check for Playwright logs
Write-Host "2. Checking for Playwright initialization..." -ForegroundColor Yellow
$playwrightLogs = aws logs filter-log-events `
    --log-group-name $LogGroupName `
    --start-time $startTimeUnix `
    --end-time $endTimeUnix `
    --filter-pattern "playwright OR Playwright OR launchChromium OR playwright-aws-lambda" `
    --max-items 100 2>&1 | ConvertFrom-Json

if ($playwrightLogs.events) {
    Write-Host "✅ Found $($playwrightLogs.events.Count) Playwright-related logs:" -ForegroundColor Green
    Write-Host ""
    $playwrightLogs.events | ForEach-Object {
        $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
        Write-Host "   [$timestamp] $($_.message)" -ForegroundColor Cyan
    }
    
    # Check if initialized
    $initialized = $playwrightLogs.events | Where-Object { 
        $_.message -match "Initialized Playwright|launchChromium.*function|import method" 
    }
    if ($initialized) {
        Write-Host ""
        Write-Host "✅ Playwright was initialized!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Playwright logs found but no initialization confirmation" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ No Playwright logs found!" -ForegroundColor Red
    Write-Host "   This means Playwright was never attempted or failed silently" -ForegroundColor Yellow
}
Write-Host ""

# Check for Google News URLs
Write-Host "3. Checking for Google News URLs..." -ForegroundColor Yellow
$googleNewsLogs = aws logs filter-log-events `
    --log-group-name $LogGroupName `
    --start-time $startTimeUnix `
    --end-time $endTimeUnix `
    --filter-pattern "news.google.com" `
    --max-items 50 2>&1 | ConvertFrom-Json

if ($googleNewsLogs.events) {
    Write-Host "✅ Found $($googleNewsLogs.events.Count) Google News URL references:" -ForegroundColor Green
    $googleNewsLogs.events | Select-Object -First 10 | ForEach-Object {
        $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
        $msg = $_.message.Substring(0, [Math]::Min(200, $_.message.Length))
        Write-Host "   [$timestamp] $msg" -ForegroundColor Cyan
    }
} else {
    Write-Host "⚠️  No Google News URLs found" -ForegroundColor Yellow
    Write-Host "   This may mean discover stage didn't find any" -ForegroundColor Gray
}
Write-Host ""

# Check for scrape stage
Write-Host "4. Checking scrape stage execution..." -ForegroundColor Yellow
$scrapeLogs = aws logs filter-log-events `
    --log-group-name $LogGroupName `
    --start-time $startTimeUnix `
    --end-time $endTimeUnix `
    --filter-pattern "scrape OR Scrape" `
    --max-items 50 2>&1 | ConvertFrom-Json

if ($scrapeLogs.events) {
    Write-Host "✅ Found $($scrapeLogs.events.Count) scrape-related logs:" -ForegroundColor Green
    
    # Check for "usedPlaywright" or "usePlaywright"
    $playwrightUsage = $scrapeLogs.events | Where-Object { 
        $_.message -match "usedPlaywright|usePlaywright|Using Playwright|Playwright gateway" 
    }
    
    if ($playwrightUsage) {
        Write-Host ""
        Write-Host "✅ Playwright was used in scrape stage:" -ForegroundColor Green
        $playwrightUsage | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
            Write-Host "   [$timestamp] $($_.message)" -ForegroundColor Cyan
        }
    } else {
        Write-Host ""
        Write-Host "❌ Scrape stage ran but Playwright was NOT used" -ForegroundColor Red
        Write-Host "   Checking for errors..." -ForegroundColor Yellow
        
        # Check for errors in scrape
        $scrapeErrors = $scrapeLogs.events | Where-Object { 
            $_.message -match "error|Error|ERROR|failed|Failed|not available" 
        }
        if ($scrapeErrors) {
            Write-Host ""
            Write-Host "   Errors found:" -ForegroundColor Red
            $scrapeErrors | ForEach-Object {
                $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
                $msg = $_.message.Substring(0, [Math]::Min(300, $_.message.Length))
                Write-Host "   [$timestamp] $msg" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "⚠️  No scrape stage logs found" -ForegroundColor Yellow
    Write-Host "   Scrape stage may not have executed" -ForegroundColor Gray
}
Write-Host ""

# Check for all errors
Write-Host "5. Checking for errors..." -ForegroundColor Yellow
$errorLogs = aws logs filter-log-events `
    --log-group-name $LogGroupName `
    --start-time $startTimeUnix `
    --end-time $endTimeUnix `
    --filter-pattern "ERROR OR error OR Error OR failed OR Failed" `
    --max-items 100 2>&1 | ConvertFrom-Json

if ($errorLogs.events) {
    Write-Host "⚠️  Found $($errorLogs.events.Count) error logs:" -ForegroundColor Yellow
    $errorLogs.events | Select-Object -Last 20 | ForEach-Object {
        $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
        $msg = $_.message.Substring(0, [Math]::Min(400, $_.message.Length))
        Write-Host "   [$timestamp] $msg" -ForegroundColor Red
    }
} else {
    Write-Host "✅ No errors found" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host ("=" * 80)
Write-Host "📊 Analysis Summary" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Playwright logs: $(if ($playwrightLogs.events) { "✅ Found $($playwrightLogs.events.Count)" } else { "❌ None" })" -ForegroundColor $(if ($playwrightLogs.events) { "Green" } else { "Red" })
Write-Host "   Google News URLs: $(if ($googleNewsLogs.events) { "✅ Found $($googleNewsLogs.events.Count)" } else { "⚠️  None" })" -ForegroundColor $(if ($googleNewsLogs.events) { "Green" } else { "Yellow" })
Write-Host "   Scrape stage: $(if ($scrapeLogs.events) { "✅ Executed" } else { "❌ Not found" })" -ForegroundColor $(if ($scrapeLogs.events) { "Green" } else { "Red" })
Write-Host "   Errors: $(if ($errorLogs.events) { "⚠️  $($errorLogs.events.Count) found" } else { "✅ None" })" -ForegroundColor $(if ($errorLogs.events) { "Yellow" } else { "Green" })
Write-Host ""

Write-Host "CloudWatch Logs:" -ForegroundColor Cyan
$logUrl = "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%252Faws%252Flambda%252Fpipeline-orchestrator"
Write-Host $logUrl -ForegroundColor Cyan
Write-Host ""

