# Diagnostic Script: Analyze Why Summarize Returned 0 Results
# Usage: .\diagnose-summarize.ps1 -RunId "run_1763438165358_t77rt"

param(
    [Parameter(Mandatory=$true)]
    [string]$RunId
)

Write-Host "`n🔍 DIAGNOSING SUMMARIZE STAGE FAILURE`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

$debugDir = "output/episodes/$RunId/debug"

if (-not (Test-Path $debugDir)) {
    Write-Host "❌ Debug directory not found: $debugDir" -ForegroundColor Red
    exit 1
}

# 1. Check Extract Output
Write-Host "1️⃣ EXTRACT OUTPUT ANALYSIS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$extractFile = "$debugDir/extract_output.json"
if (Test-Path $extractFile) {
    $extract = Get-Content $extractFile | ConvertFrom-Json
    Write-Host "   ✅ Total Evidence Units: $($extract.stats.totalUnits)" -ForegroundColor Green
    Write-Host "   📊 By Type:" -ForegroundColor Cyan
    Write-Host "      Stats:   $($extract.stats.byType.stat)" -ForegroundColor White
    Write-Host "      Quotes:  $($extract.stats.byType.quote)" -ForegroundColor White
    Write-Host "      Claims:  $($extract.stats.byType.claim)" -ForegroundColor White
    
    # Check sample evidence structure
    if ($extract.sampleEvidence -and $extract.sampleEvidence.Count -gt 0) {
        $sample = $extract.sampleEvidence[0]
        Write-Host "`n   🔍 Sample Evidence Unit Structure:" -ForegroundColor Cyan
        Write-Host "      Fields present: $($sample.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
        $hasSpan = $sample.span -ne $null -and $sample.span -ne ''
        Write-Host "      Has span: $hasSpan" -ForegroundColor $(if($hasSpan){"Green"}else{"Red"})
    }
} else {
    Write-Host "   ❌ Extract output file not found" -ForegroundColor Red
}

# 2. Check Summarize Input
Write-Host "`n2️⃣ SUMMARIZE INPUT ANALYSIS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$summarizeInputFile = "$debugDir/summarize_input.json"
if (Test-Path $summarizeInputFile) {
    $input = Get-Content $summarizeInputFile | ConvertFrom-Json
    Write-Host "   ✅ Topic IDs: $($input.topicIds -join ', ')" -ForegroundColor Green
    Write-Host "   ✅ Topic Count: $($input.topicCount)" -ForegroundColor Green
    Write-Host "   ✅ Evidence Count: $($input.evidenceCount)" -ForegroundColor Green
    
    Write-Host "`n   📊 Evidence By Topic:" -ForegroundColor Cyan
    foreach ($topic in $input.evidenceByTopic) {
        Write-Host "      Topic: $($topic.topicId)" -ForegroundColor White
        Write-Host "         Total Units: $($topic.unitCount)" -ForegroundColor Gray
        
        # Check valid evidence counts (if available)
        if ($topic.validStats -ne $null) {
            $statsColor = if($topic.validStats -gt 0){"Green"}else{"Red"}
            $quotesColor = if($topic.validQuotes -gt 0){"Green"}else{"Red"}
            $claimsColor = if($topic.validClaims -gt 0){"Green"}else{"Red"}
            Write-Host "         ✅ Valid Stats: $($topic.validStats)" -ForegroundColor $statsColor
            Write-Host "         ✅ Valid Quotes: $($topic.validQuotes)" -ForegroundColor $quotesColor
            Write-Host "         ✅ Valid Claims: $($topic.validClaims)" -ForegroundColor $claimsColor
        }
        
        # Check sample units
        if ($topic.sampleUnits -and $topic.sampleUnits.Count -gt 0) {
            $sample = $topic.sampleUnits[0]
            Write-Host "`n         🔍 Sample Unit Fields:" -ForegroundColor Cyan
            $spanColor = if($sample.hasSpan){"Green"}else{"Red"}
            $authColor = if($sample.hasAuthority){"Green"}else{"Red"}
            $pubColor = if($sample.hasPublisher){"Green"}else{"Red"}
            $ctxColor = if($sample.hasContext){"Green"}else{"Red"}
            Write-Host "            Has span: $($sample.hasSpan)" -ForegroundColor $spanColor
            Write-Host "            Has authority: $($sample.hasAuthority)" -ForegroundColor $authColor
            Write-Host "            Has publisher: $($sample.hasPublisher)" -ForegroundColor $pubColor
            Write-Host "            Has context: $($sample.hasContext)" -ForegroundColor $ctxColor
            if ($sample.authority -ne $null) {
                Write-Host "            Authority value: $($sample.authority)" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "   ❌ Summarize input file not found" -ForegroundColor Red
}

# 3. Check Summarize Output
Write-Host "`n3️⃣ SUMMARIZE OUTPUT ANALYSIS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$summarizeOutputFile = "$debugDir/summarize_output.json"
if (Test-Path $summarizeOutputFile) {
    $output = Get-Content $summarizeOutputFile | ConvertFrom-Json
    Write-Host "   ✅ Output file exists" -ForegroundColor Green
    Write-Host "   📊 Summary Count: $($output.summaryCount)" -ForegroundColor $(if($output.summaryCount -gt 0){"Green"}else{"Red"})
    
    if ($output.error) {
        Write-Host "   ❌ Error: $($output.error)" -ForegroundColor Red
        Write-Host "   💬 Message: $($output.message)" -ForegroundColor Yellow
    }
    
    if ($output.summaries -and $output.summaries.Count -gt 0) {
        Write-Host "   ✅ Summaries generated successfully" -ForegroundColor Green
    } else {
        Write-Host "   ❌ No summaries generated" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Summarize output file not found" -ForegroundColor Red
}

# 4. Check for Error File
Write-Host "`n4️⃣ ERROR FILE CHECK" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$errorFile = "$debugDir/summarize_error.json"
if (Test-Path $errorFile) {
    Write-Host "   ⚠️  Error file found!" -ForegroundColor Red
    $error = Get-Content $errorFile | ConvertFrom-Json
    Write-Host "   Error: $($error.error)" -ForegroundColor Red
    if ($error.stack) {
        Write-Host "   Stack: $($error.stack.Substring(0, [Math]::Min(200, $error.stack.Length)))..." -ForegroundColor Gray
    }
} else {
    Write-Host "   ✅ No error file (stage completed, but may have returned 0 results)" -ForegroundColor Green
}

# 5. Diagnosis
Write-Host "`n5️⃣ DIAGNOSIS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if (Test-Path $summarizeInputFile) {
    $input = Get-Content $summarizeInputFile | ConvertFrom-Json
    $topic = $input.evidenceByTopic[0]
    
    if ($topic.validStats -ne $null) {
        if ($topic.validStats -eq 0 -or $topic.validQuotes -eq 0) {
            Write-Host "   ❌ ROOT CAUSE IDENTIFIED:" -ForegroundColor Red
            Write-Host "      Evidence units are missing required fields!" -ForegroundColor White
            Write-Host "      Valid Stats: $($topic.validStats) (need at least 1)" -ForegroundColor $(if($topic.validStats -gt 0){"Green"}else{"Red"})
            Write-Host "      Valid Quotes: $($topic.validQuotes) (need at least 1)" -ForegroundColor $(if($topic.validQuotes -gt 0){"Green"}else{"Red"})
            Write-Host "`n   💡 SOLUTION:" -ForegroundColor Yellow
            Write-Host "      Check Extract stage - ensure it sets 'authority' field on all evidence units" -ForegroundColor White
            Write-Host "      Check that evidence units have both 'span' and 'authority' fields" -ForegroundColor White
        } else {
            Write-Host "   ✅ Evidence has valid stats and quotes" -ForegroundColor Green
            Write-Host "   ⚠️  Issue may be in LLM generation or other logic" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Cannot diagnose - debug output doesn't include validity counts" -ForegroundColor Yellow
        Write-Host "      Run a new podcast to get enhanced debug output" -ForegroundColor White
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

