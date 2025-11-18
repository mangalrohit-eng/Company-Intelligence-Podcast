# Pipeline Monitoring Script
# Monitors all 13 stages and tests them individually using stubs

param(
    [Parameter(Mandatory=$false)]
    [string]$RunId = "run_1763439862339_bmo4vk",
    
    [Parameter(Mandatory=$false)]
    [switch]$TestStubs = $false
)

$ErrorActionPreference = "Continue"

Write-Host "`nPIPELINE MONITORING & TESTING`n" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------`n" -ForegroundColor Gray

$debugDir = "output/episodes/$RunId/debug"
$stages = @(
    @{Name="prepare"; Description="Prepare"},
    @{Name="discover"; Description="Discover"},
    @{Name="disambiguate"; Description="Disambiguate"},
    @{Name="rank"; Description="Rank"},
    @{Name="scrape"; Description="Scrape"},
    @{Name="extract"; Description="Extract"},
    @{Name="summarize"; Description="Summarize"},
    @{Name="contrast"; Description="Contrast"},
    @{Name="outline"; Description="Outline"},
    @{Name="script"; Description="Script"},
    @{Name="qa"; Description="QA"},
    @{Name="tts"; Description="TTS"},
    @{Name="package"; Description="Package"}
)

Write-Host "STAGE STATUS FOR RUN: $RunId`n" -ForegroundColor Yellow

$completedStages = @()
$inProgressStages = @()
$pendingStages = @()

foreach ($stage in $stages) {
    $outputFile = "$debugDir/$($stage.Name)_output.json"
    $inputFile = "$debugDir/$($stage.Name)_input.json"
    $errorFile = "$debugDir/$($stage.Name)_error.json"
    
    if (Test-Path $outputFile) {
        $age = (Get-Date) - (Get-Item $outputFile).LastWriteTime
        Write-Host "[OK] $($stage.Description.PadRight(15)) - COMPLETE ($([math]::Round($age.TotalSeconds))s ago)" -ForegroundColor Green
        
        # Show summary stats
        try {
            $data = Get-Content $outputFile | ConvertFrom-Json
            if ($stage.Name -eq "scrape") {
                Write-Host "   -> Success: $($data.stats.successCount), Failure: $($data.stats.failureCount), Content: $($data.contentCount)" -ForegroundColor Gray
            } elseif ($stage.Name -eq "extract") {
                Write-Host "   -> Units: $($data.stats.totalUnits) (Stats: $($data.stats.byType.stat), Quotes: $($data.stats.byType.quote))" -ForegroundColor Gray
            } elseif ($stage.Name -eq "summarize") {
                Write-Host "   -> Summaries: $($data.summaryCount)" -ForegroundColor Gray
            } elseif ($stage.Name -eq "contrast") {
                Write-Host "   -> Comparisons: $($data.comparisonCount)" -ForegroundColor Gray
            } elseif ($stage.Name -eq "outline") {
                Write-Host "   -> Segments: $($data.outline.segments.Count)" -ForegroundColor Gray
            } elseif ($stage.Name -eq "script") {
                Write-Host "   -> Narrative: $($data.narrativeLength) chars, Duration: $($data.durationEstimateSeconds)s" -ForegroundColor Gray
            } elseif ($stage.Name -eq "qa") {
                Write-Host "   -> Issues: $($data.issueCount), Passed: $($data.passed)" -ForegroundColor Gray
            } elseif ($stage.Name -eq "tts") {
                Write-Host "   -> Audio: $($data.audioSizeKB) KB, Duration: $($data.durationSeconds)s" -ForegroundColor Gray
            }
        } catch {
            # Ignore parsing errors
        }
        
        $completedStages += $stage.Name
    } elseif (Test-Path $inputFile) {
        $age = (Get-Date) - (Get-Item $inputFile).LastWriteTime
        Write-Host "[...] $($stage.Description.PadRight(15)) - IN PROGRESS ($([math]::Round($age.TotalSeconds))s ago)" -ForegroundColor Cyan
        $inProgressStages += $stage.Name
    } elseif (Test-Path $errorFile) {
        Write-Host "[ERR] $($stage.Description.PadRight(15)) - FAILED" -ForegroundColor Red
        try {
            $err = Get-Content $errorFile | ConvertFrom-Json
            Write-Host "   Error: $($err.error)" -ForegroundColor Red
        } catch {
            Write-Host "   Error file exists but couldn't parse" -ForegroundColor Red
        }
    } else {
        Write-Host "[...] $($stage.Description.PadRight(15)) - PENDING" -ForegroundColor Yellow
        $pendingStages += $stage.Name
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

Write-Host "SUMMARY:" -ForegroundColor Yellow
Write-Host "   Completed: $($completedStages.Count)/13" -ForegroundColor Green
Write-Host "   In Progress: $($inProgressStages.Count)" -ForegroundColor Cyan
Write-Host "   Pending: $($pendingStages.Count)" -ForegroundColor Yellow

if ($TestStubs -and $pendingStages.Count -gt 0) {
    Write-Host "`nTESTING PENDING STAGES WITH STUBS...`n" -ForegroundColor Cyan
    
    # Find the last completed stage
    $lastCompletedIndex = -1
    for ($i = 0; $i -lt $stages.Count; $i++) {
        if ($completedStages -contains $stages[$i].Name) {
            $lastCompletedIndex = $i
        }
    }
    
    if ($lastCompletedIndex -ge 0) {
        $nextStage = $stages[$lastCompletedIndex + 1]
        if ($nextStage) {
            Write-Host "Testing next stage: $($nextStage.Name)" -ForegroundColor Yellow
            Write-Host "Command: npx tsx test-stage-stub.ts $($nextStage.Name) $RunId`n" -ForegroundColor Gray
            
            # Run the stub test
            npx tsx test-stage-stub.ts $nextStage.Name $RunId
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n[OK] Stub test completed successfully!" -ForegroundColor Green
            } else {
                Write-Host "`n[ERR] Stub test failed. Check logs above." -ForegroundColor Red
            }
        }
    }
}

Write-Host "`n"

