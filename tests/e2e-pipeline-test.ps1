#!/usr/bin/env pwsh
<#
.SYNOPSIS
End-to-End Pipeline Test - Ensures podcasts always generate with real content

.DESCRIPTION
This test:
1. Triggers a podcast run
2. Waits for completion  
3. Verifies evidence extraction
4. Validates transcript contains real company-specific content
5. Checks audio file generation
6. Fails if any step produces generic/template content

.PARAMETER PodcastId
The podcast ID to test (defaults to Citibank podcast)

.PARAMETER CompanyName
The company name to verify in content (defaults to Citibank/Citigroup/Citi)

.EXAMPLE
.\tests\e2e-pipeline-test.ps1
#>

param(
    [string]$PodcastId = "podcast_ee7a7f71-92c1-4968-a5ce-79ea8ba9dfc5",
    [string]$CompanyName = "Citibank|Citigroup|Citi"
)

$ErrorActionPreference = "Stop"
$testStartTime = Get-Date

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  E2E PIPELINE TEST - Real Content Verification" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# Test configuration
$apiBase = "http://localhost:3000/api"
$maxWaitSeconds = 300  # 5 minutes timeout
$pollIntervalSeconds = 5

# Test results
$testResults = @{
    Passed = @()
    Failed = @()
    Warnings = @()
}

function Test-Assertion {
    param(
        [string]$TestName,
        [bool]$Condition,
        [string]$FailureMessage
    )
    
    if ($Condition) {
        $testResults.Passed += $TestName
        Write-Host "  ✅ $TestName" -ForegroundColor Green
        return $true
    } else {
        $testResults.Failed += "$TestName`: $FailureMessage"
        Write-Host "  ❌ $TestName`: $FailureMessage" -ForegroundColor Red
        return $false
    }
}

try {
    # Step 1: Trigger pipeline run
    Write-Host "📊 Step 1: Triggering pipeline run..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$apiBase/podcasts/$PodcastId/runs" -Method POST -ContentType "application/json"
    $runId = $response.runId
    
    Test-Assertion -TestName "Run Created" -Condition ($null -ne $runId) -FailureMessage "No run ID returned"
    Write-Host "   Run ID: $runId`n"
    
    # Step 2: Wait for completion
    Write-Host "📊 Step 2: Waiting for pipeline completion (max ${maxWaitSeconds}s)..." -ForegroundColor Yellow
    $startWait = Get-Date
    $completed = $false
    
    while (((Get-Date) - $startWait).TotalSeconds -lt $maxWaitSeconds) {
        Start-Sleep -Seconds $pollIntervalSeconds
        
        $runs = Invoke-RestMethod -Uri "$apiBase/podcasts/$PodcastId/runs"
        $run = $runs.runs | Where-Object { $_.id -eq $runId } | Select-Object -First 1
        
        if ($run.status -eq "completed") {
            $completed = $true
            $duration = [math]::Round(((Get-Date) - $startWait).TotalSeconds, 1)
            Write-Host "   ✅ Completed in ${duration}s`n" -ForegroundColor Green
            break
        } elseif ($run.status -eq "failed") {
            throw "Pipeline run failed"
        }
    }
    
    Test-Assertion -TestName "Pipeline Completed" -Condition $completed -FailureMessage "Timeout waiting for completion"
    
    # Step 3: Verify evidence extraction
    Write-Host "📊 Step 3: Verifying evidence extraction..." -ForegroundColor Yellow
    $extractDebug = Get-Content "output\episodes\$runId\debug\05_extract.json" -ErrorAction SilentlyContinue | ConvertFrom-Json
    
    $hasEvidence = $extractDebug.evidenceCount -gt 0
    Test-Assertion -TestName "Evidence Extracted" -Condition $hasEvidence -FailureMessage "0 evidence units extracted"
    
    if ($hasEvidence) {
        Write-Host "   📝 Evidence units: $($extractDebug.evidenceCount)" -ForegroundColor Cyan
        Write-Host "   📝 Types: $($extractDebug.stats.byType | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    }
    Write-Host ""
    
    # Step 4: Verify transcript has real content
    Write-Host "📊 Step 4: Validating transcript content..." -ForegroundColor Yellow
    $transcript = Get-Content "output\episodes\$runId\${runId}_transcript.txt" -Raw -ErrorAction SilentlyContinue
    
    Test-Assertion -TestName "Transcript Exists" -Condition ($null -ne $transcript -and $transcript.Length -gt 0) -FailureMessage "Transcript file missing or empty"
    
    # Check for company-specific content
    $hasCompanyContent = $transcript -match $CompanyName
    Test-Assertion -TestName "Contains Company Name" -Condition $hasCompanyContent -FailureMessage "Transcript doesn't mention $CompanyName"
    
    # Check it's NOT generic template
    $hasGenericContent = $transcript -match '\[Podcast Name\]|\[Host.*Name\]|\[Theme\]|\[Topic \d+\]'
    Test-Assertion -TestName "No Generic Templates" -Condition (-not $hasGenericContent) -FailureMessage "Transcript contains placeholder templates"
    
    # Check for financial/business terms (indicates real content)
    $hasBusinessTerms = $transcript -match '\$[\d,]+(\.\d+)?\s*(billion|million)|revenue|earnings|quarter|CEO|growth|profit'
    Test-Assertion -TestName "Contains Business Data" -Condition $hasBusinessTerms -FailureMessage "No financial/business terms found"
    Write-Host ""
    
    # Step 5: Verify audio file
    Write-Host "📊 Step 5: Checking audio file generation..." -ForegroundColor Yellow
    $audioPath = "output\episodes\$runId\audio.mp3"
    $audioExists = Test-Path $audioPath
    
    Test-Assertion -TestName "Audio File Exists" -Condition $audioExists -FailureMessage "Audio file not generated"
    
    if ($audioExists) {
        $audioSize = (Get-Item $audioPath).Length
        $audioSizeMB = [math]::Round($audioSize / 1MB, 2)
        $audioSizeOK = $audioSize -gt 100KB  # At least 100KB
        $audioMsg = "Audio file too small: $audioSizeMB MB"
        
        Test-Assertion -TestName "Audio File Size OK" -Condition $audioSizeOK -FailureMessage $audioMsg
        Write-Host "   Audio size: $audioSizeMB MB`n" -ForegroundColor Cyan
    }
    
    # Step 6: Verify debug files
    Write-Host "📊 Step 6: Checking debug outputs..." -ForegroundColor Yellow
    $debugFiles = @("01_discover.json", "04_scrape.json", "05_extract.json")
    foreach ($file in $debugFiles) {
        $exists = Test-Path "output\episodes\$runId\debug\$file"
        Test-Assertion -TestName "Debug file: $file" -Condition $exists -FailureMessage "Missing"
    }
    Write-Host ""
    
} catch {
    $testResults.Failed += "Fatal Error: $($_.Exception.Message)"
    Write-Host "`n❌ FATAL ERROR: $($_.Exception.Message)`n" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
}

# Print summary
$testDuration = [math]::Round(((Get-Date) - $testStartTime).TotalSeconds, 1)
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

Write-Host "Duration: ${testDuration}s" -ForegroundColor Cyan
Write-Host "Passed:   $($testResults.Passed.Count)" -ForegroundColor Green
Write-Host "Failed:   $($testResults.Failed.Count)" -ForegroundColor $(if ($testResults.Failed.Count -gt 0) { "Red" } else { "Green" })
Write-Host "Warnings: $($testResults.Warnings.Count)" -ForegroundColor Yellow

if ($testResults.Failed.Count -gt 0) {
    Write-Host "`n❌ FAILED TESTS:" -ForegroundColor Red
    $testResults.Failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

if ($testResults.Passed.Count -eq 0) {
    Write-Host "`n⚠️  NO TESTS RUN" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✅✅✅ ALL TESTS PASSED! ✅✅✅" -ForegroundColor Green
Write-Host "`nRun ID: $runId" -ForegroundColor Cyan
Write-Host "Listen: http://localhost:3000/podcasts/$PodcastId/runs/$runId`n" -ForegroundColor Cyan

exit 0

