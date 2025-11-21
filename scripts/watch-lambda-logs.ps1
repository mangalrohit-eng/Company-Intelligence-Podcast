# Watch Lambda logs for S3 write issues
# Usage: .\scripts\watch-lambda-logs.ps1 [runId]

param(
    [string]$RunId = ""
)

$logGroup = "/aws/lambda/pipeline-orchestrator"
$filter = if ($RunId) { $RunId } else { "" }

Write-Host "`n🔍 Monitoring Lambda logs for S3 write issues..." -ForegroundColor Cyan
if ($RunId) {
    Write-Host "   Filtering for run: $RunId" -ForegroundColor Yellow
} else {
    Write-Host "   Showing all recent activity" -ForegroundColor Yellow
}
Write-Host "   Press Ctrl+C to stop`n" -ForegroundColor Gray

while ($true) {
    try {
        $logs = aws logs tail $logGroup --since 2m --format short 2>&1
        
        if ($RunId) {
            $filtered = $logs | Select-String -Pattern $RunId
        } else {
            $filtered = $logs
        }
        
        $s3Issues = $filtered | Select-String -Pattern "Failed to write|S3 write timeout|Successfully wrote|File written to S3|Using.*credential|region|REGION|Error|error"
        
        if ($s3Issues) {
            Write-Host "`n⚠️  S3 WRITE ACTIVITY DETECTED:" -ForegroundColor Yellow
            $s3Issues | ForEach-Object {
                $line = $_.Line
                if ($line -match "Failed|timeout|Error|error") {
                    Write-Host "   ❌ $line" -ForegroundColor Red
                } elseif ($line -match "Successfully|File written") {
                    Write-Host "   ✅ $line" -ForegroundColor Green
                } else {
                    Write-Host "   ℹ️  $line" -ForegroundColor Cyan
                }
            }
        }
        
        Start-Sleep -Seconds 5
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
        Start-Sleep -Seconds 5
    }
}

