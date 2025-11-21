# Start a pipeline run and monitor for Playwright usage
param(
    [string]$PodcastId = "b692ff4c-f180-46f0-863c-c44d4e667101"
)

$FunctionName = "pipeline-orchestrator"
$LogGroupName = "/aws/lambda/$FunctionName"
$StateMachineArn = "arn:aws:states:us-east-1:098478926952:stateMachine:podcast-pipeline"

Write-Host "🚀 Starting Pipeline Run for Podcast" -ForegroundColor Cyan
Write-Host ("=" * 80)
Write-Host "Podcast ID: $PodcastId" -ForegroundColor Yellow
Write-Host ("=" * 80)
Write-Host ""

# Step 1: Get podcast config from DynamoDB
Write-Host "1. Getting podcast configuration..." -ForegroundColor Yellow
$podcast = aws dynamodb get-item `
    --table-name podcasts `
    --key "{\"id\":{\"S\":\"$PodcastId\"}}" `
    2>&1 | ConvertFrom-Json

if (-not $podcast.Item) {
    Write-Host "❌ Podcast not found!" -ForegroundColor Red
    exit 1
}

# Get latest config version
$configs = aws dynamodb query `
    --table-name podcast_configs `
    --key-condition-expression "podcastId = :pid" `
    --expression-attribute-values "{\":pid\":{\"S\":\"$PodcastId\"}}" `
    --scan-index-forward false `
    --limit 1 `
    2>&1 | ConvertFrom-Json

if (-not $configs.Items -or $configs.Items.Count -eq 0) {
    Write-Host "❌ No config found for podcast!" -ForegroundColor Red
    exit 1
}

$config = $configs.Items[0]
Write-Host "✅ Found config version: $($config.version.N)" -ForegroundColor Green
Write-Host ""

# Step 2: Create run
Write-Host "2. Creating pipeline run..." -ForegroundColor Yellow
$runId = "run-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Create run via Step Functions
$stepFunctionsInput = @{
    runId = $runId
    podcastId = $PodcastId
    configVersion = [int]$config.version.N
    config = @{
        companyId = $config.config.M.companyId.S
        industry = $config.config.M.industry.S
        competitors = @()
        durationMinutes = [int]$config.config.M.durationMinutes.N
        voice = $config.config.M.voice.S
        version = [int]$config.version.N
    }
    flags = @{
        enable = @{
            prepare = $true
            discover = $true
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

$stepFunctionsInput | Out-File "stepfunctions-input-$runId.json" -Encoding utf8

$execution = aws stepfunctions start-execution `
    --state-machine-arn $StateMachineArn `
    --name $runId `
    --input "file://stepfunctions-input-$runId.json" `
    2>&1 | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start execution: $execution" -ForegroundColor Red
    exit 1
}

$executionArn = $execution.executionArn
Write-Host "✅ Run started!" -ForegroundColor Green
Write-Host "   Run ID: $runId" -ForegroundColor Gray
Write-Host "   Execution ARN: $executionArn" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
$startTimeUnix = [int64]((Get-Date $startTime).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds

# Step 3: Monitor logs
Write-Host "3. Monitoring CloudWatch logs for Playwright..." -ForegroundColor Yellow
Write-Host "   (Checking every 10 seconds, max 15 minutes)" -ForegroundColor Gray
Write-Host ""

$maxWaitMinutes = 15
$checkInterval = 10
$elapsed = 0
$playwrightFound = $false
$playwrightInitialized = $false
$googleNewsFound = $false
$scrapeStarted = $false
$errorsFound = @()

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
        Write-Host ""
    }
    
    # Check for errors
    $errorLogs = aws logs filter-log-events `
        --log-group-name $LogGroupName `
        --start-time $startTimeUnix `
        --end-time $currentTimeUnix `
        --filter-pattern "ERROR OR error OR Error OR failed OR Failed" `
        --max-items 20 2>&1 | ConvertFrom-Json
    
    if ($errorLogs.events) {
        $recentErrors = $errorLogs.events | Where-Object { 
            $_.timestamp -gt ($currentTimeUnix - 60000) # Last 60 seconds
        }
        foreach ($err in $recentErrors) {
            $errMsg = $err.message
            if ($errorsFound -notcontains $errMsg) {
                $errorsFound += $errMsg
                Write-Host "⚠️  New error found:" -ForegroundColor Yellow
                $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($err.timestamp).LocalDateTime.ToString("HH:mm:ss")
                $msg = $errMsg.Substring(0, [Math]::Min(300, $errMsg.Length))
                Write-Host "   [$timestamp] $msg" -ForegroundColor Red
                Write-Host ""
            }
        }
    }
    
    Write-Host "   [$(Get-Date -Format 'HH:mm:ss')] Monitoring... ($elapsed seconds)" -ForegroundColor DarkGray
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

# Get all Playwright logs
Write-Host "4. Retrieving all Playwright logs..." -ForegroundColor Yellow
$endTimeUnix = [int64]((Get-Date).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds

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
    Write-Host "`n❌ No Playwright logs found!" -ForegroundColor Red
    Write-Host "   Checking for errors that might explain why..." -ForegroundColor Yellow
    
    $allErrors = aws logs filter-log-events `
        --log-group-name $LogGroupName `
        --start-time $startTimeUnix `
        --end-time $endTimeUnix `
        --filter-pattern "ERROR OR error" `
        --max-items 50 2>&1 | ConvertFrom-Json
    
    if ($allErrors.events) {
        Write-Host "`n   Recent errors:" -ForegroundColor Red
        $allErrors.events | Select-Object -Last 20 | ForEach-Object {
            $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($_.timestamp).LocalDateTime.ToString("HH:mm:ss")
            $msg = $_.message.Substring(0, [Math]::Min(400, $_.message.Length))
            Write-Host "   [$timestamp] $msg" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "CloudWatch Logs:" -ForegroundColor Cyan
$logUrl = "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%252Faws%252Flambda%252F$FunctionName"
Write-Host $logUrl -ForegroundColor Cyan
Write-Host ""
Write-Host "Step Functions Execution:" -ForegroundColor Cyan
$sfUrl = "https://console.aws.amazon.com/states/home?region=us-east-1#/executions/details/$executionArn"
Write-Host $sfUrl -ForegroundColor Cyan
Write-Host ""

# Cleanup
Remove-Item "stepfunctions-input-$runId.json" -ErrorAction SilentlyContinue

