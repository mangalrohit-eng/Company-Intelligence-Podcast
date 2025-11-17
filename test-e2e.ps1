# COMPREHENSIVE E2E TEST CHECKLIST
# Run this after any UI/API changes

Write-Host "
"
Write-Host "   COMPREHENSIVE END-TO-END TEST                           "
Write-Host "
"

$baseUrl = "http://localhost:3000"
$podcastId = "podcast_ee7a7f71-92c1-4968-a5ce-79ea8ba9dfc5"
$runId = "run_1763404293753_cgw7e"

Write-Host " LEVEL 1: API ENDPOINTS
"
try {
    $podcasts = Invoke-WebRequest -Uri "$baseUrl/api/podcasts" | ConvertFrom-Json
    Write-Host "    Podcasts API"
} catch { Write-Host "    Podcasts API: $_" }

try {
    $runs = Invoke-WebRequest -Uri "$baseUrl/api/podcasts/$podcastId/runs" | ConvertFrom-Json
    Write-Host "    Runs API (returned $($runs.total) runs)"
    
    # Validate run structure
    if ($runs.runs.Count -gt 0) {
        $testRun = $runs.runs[0]
        $stageCount = ($testRun.progress.stages | Get-Member -MemberType NoteProperty).Count
        if ($stageCount -eq 13) {
            Write-Host "    Run data structure: 13 stages"
        } else {
            Write-Host "    Run data structure: only $stageCount stages (expected 13)"
        }
        
        if ($testRun.output.audioPath) {
            Write-Host "    Run has audioPath: $($testRun.output.audioPath)"
        } else {
            Write-Host "    Run missing audioPath"
        }
    }
} catch { Write-Host "    Runs API: $_" }

Write-Host "
 LEVEL 2: PAGE LOADS
"
try {
    $listPage = Invoke-WebRequest -Uri "$baseUrl/podcasts" -TimeoutSec 10
    Write-Host "    Podcast list page ($($listPage.StatusCode))"
} catch { Write-Host "    Podcast list page: $_" }

try {
    $detailPage = Invoke-WebRequest -Uri "$baseUrl/podcasts/$podcastId" -TimeoutSec 10
    Write-Host "    Podcast detail page ($($detailPage.StatusCode))"
    
    # Check for dummy data
    if ($detailPage.Content -match 'Tesla|Rivian|john@company\.com|Episode 42') {
        Write-Host "     WARNING: Dummy data detected!"
    }
} catch { Write-Host "    Podcast detail page: $_" }

try {
    $runPage = Invoke-WebRequest -Uri "$baseUrl/podcasts/$podcastId/runs/$runId" -TimeoutSec 10
    Write-Host "    Run detail page ($($runPage.StatusCode))"
    
    # Check for expected features
    if ($runPage.Content -match 'audio controls') {
        Write-Host "    Audio player HTML present"
    } else {
        Write-Host "    Audio player HTML missing"
    }
    
    if ($runPage.Content -match 'Download Transcript') {
        Write-Host "    Download buttons present"
    } else {
        Write-Host "    Download buttons missing"
    }
    
    # Check all stages are mentioned
    $stages = @('Prepare', 'Discover', 'Disambiguate', 'Rank', 'Scrape', 'Extract', 'Summarize', 'Contrast', 'Outline', 'Script', 'QA', 'TTS', 'Package')
    $missingStages = @()
    foreach ($stage in $stages) {
        if ($runPage.Content -notmatch $stage) {
            $missingStages += $stage
        }
    }
    if ($missingStages.Count -eq 0) {
        Write-Host "    All 13 stages displayed"
    } else {
        Write-Host "    Missing stages: $($missingStages -join ', ')"
    }
} catch { Write-Host "    Run detail page: $_" }

Write-Host "
 LEVEL 3: FILE SERVING
"
try {
    $audioFile = Invoke-WebRequest -Uri "$baseUrl/output/episodes/$runId/audio.mp3" -Method HEAD
    Write-Host "    Audio file accessible ($([math]::Round($audioFile.Headers.'Content-Length'/1MB, 2)) MB)"
    if ($audioFile.Headers.'Content-Type' -eq 'audio/mpeg') {
        Write-Host "    Correct content-type: audio/mpeg"
    } else {
        Write-Host "     Wrong content-type: $($audioFile.Headers.'Content-Type')"
    }
} catch { Write-Host "    Audio file not accessible: $_" }

try {
    $transcript = Invoke-WebRequest -Uri "$baseUrl/output/episodes/$runId/run_${runId}_transcript.txt" -Method HEAD
    Write-Host "    Transcript file accessible"
} catch { Write-Host "     Transcript file not accessible (may not exist yet)"  }

try {
    $showNotes = Invoke-WebRequest -Uri "$baseUrl/output/episodes/$runId/run_${runId}_show_notes.md" -Method HEAD
    Write-Host "    Show notes file accessible"
} catch { Write-Host "     Show notes file not accessible (may not exist yet)" }

Write-Host "
"
Write-Host "   TEST COMPLETE                                            "
Write-Host "
"
