# Stop and Delete All Pending/Running Runs
# This script stops all pending or running runs and then deletes them from DynamoDB

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================="
Write-Host "Stop and Delete All Pending/Running Runs"
Write-Host "========================================="
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Check if AWS CLI is available
try {
    $awsVersion = aws --version 2>&1
    Write-Host "AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Set AWS region
$region = $env:AWS_REGION
if (-not $region) {
    $region = "us-east-1"
    Write-Host "AWS_REGION not set, using default: $region" -ForegroundColor Yellow
}

$runsTable = "runs"

Write-Host "Scanning DynamoDB table: $runsTable" -ForegroundColor Cyan
Write-Host ""

# Scan for all runs
$allRuns = @()
$lastEvaluatedKey = $null
$scanCount = 0

do {
    $scanParams = @{
        TableName = $runsTable
        Limit = 100
    }
    
    if ($lastEvaluatedKey) {
        $scanParams.ExclusiveStartKey = $lastEvaluatedKey
    }
    
    $scanResult = aws dynamodb scan `
        --table-name $runsTable `
        --region $region `
        --output json | ConvertFrom-Json
    
    if ($scanResult.Items) {
        $allRuns += $scanResult.Items
        $scanCount += $scanResult.Items.Count
        Write-Host "  Scanned $scanCount runs..." -ForegroundColor Gray
    }
    
    $lastEvaluatedKey = $scanResult.LastEvaluatedKey
} while ($lastEvaluatedKey)

Write-Host ""
Write-Host "Found $($allRuns.Count) total runs" -ForegroundColor Cyan

# Filter for pending or running runs
$runsToProcess = @()
foreach ($item in $allRuns) {
    $runId = $item.id.S
    $status = $item.status.S
    
    if ($status -eq "pending" -or $status -eq "running") {
        $runsToProcess += @{
            Id = $runId
            Status = $status
            PodcastId = $item.podcastId.S
            CreatedAt = $item.createdAt.S
        }
    }
}

Write-Host "Found $($runsToProcess.Count) pending or running runs" -ForegroundColor Yellow
Write-Host ""

if ($runsToProcess.Count -eq 0) {
    Write-Host "No pending or running runs found. Nothing to do." -ForegroundColor Green
    exit 0
}

# Display runs to be processed
Write-Host "Runs to process:" -ForegroundColor Cyan
foreach ($run in $runsToProcess) {
    Write-Host "  - $($run.Id) (Status: $($run.Status), Podcast: $($run.PodcastId), Created: $($run.CreatedAt))" -ForegroundColor Gray
}
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] Would stop and delete $($runsToProcess.Count) runs" -ForegroundColor Yellow
    exit 0
}

# Confirm before proceeding
$confirmation = Read-Host "Are you sure you want to stop and delete $($runsToProcess.Count) runs? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Stopping and deleting runs..." -ForegroundColor Cyan

$stoppedCount = 0
$deletedCount = 0
$errorCount = 0

foreach ($run in $runsToProcess) {
    $runId = $run.Id
    $podcastId = $run.PodcastId
    
    try {
        # Step 1: Update status to 'stopped' or 'failed'
        Write-Host "  Stopping run: $runId..." -ForegroundColor Gray
        
        $updateExpression = "SET #status = :status, #updatedAt = :updatedAt"
        $expressionAttributeNames = @{
            "#status" = "status"
            "#updatedAt" = "updatedAt"
        }
        $expressionAttributeValues = @{
            ":status" = @{ S = "stopped" }
            ":updatedAt" = @{ S = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ") }
        }
        
        # Convert to JSON for AWS CLI
        $updateParams = @{
            TableName = $runsTable
            Key = @{
                id = @{ S = $runId }
            }
            UpdateExpression = $updateExpression
            ExpressionAttributeNames = $expressionAttributeNames
            ExpressionAttributeValues = $expressionAttributeValues
        } | ConvertTo-Json -Depth 10 -Compress
        
        $updateParams | aws dynamodb update-item `
            --cli-input-json $updateParams `
            --region $region `
            --output json | Out-Null
        
        $stoppedCount++
        
        # Step 2: Delete the run
        Write-Host "  Deleting run: $runId..." -ForegroundColor Gray
        
        $deleteParams = @{
            TableName = $runsTable
            Key = @{
                id = @{ S = $runId }
            }
        } | ConvertTo-Json -Depth 10 -Compress
        
        aws dynamodb delete-item `
            --cli-input-json $deleteParams `
            --region $region `
            --output json | Out-Null
        
        $deletedCount++
        Write-Host "    [SUCCESS] Run $runId stopped and deleted" -ForegroundColor Green
        
    } catch {
        $errorCount++
        Write-Host "    [ERROR] Failed to process run $runId : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================="
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Stopped: $stoppedCount" -ForegroundColor Green
Write-Host "  Deleted: $deletedCount" -ForegroundColor Green
Write-Host "  Errors:  $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host "========================================="

