# Check run status and diagnose issues
param(
    [Parameter(Mandatory=$true)]
    [string]$RunId
)

Write-Host "🔍 Checking run status: $RunId" -ForegroundColor Cyan

# Check if run directory exists
$runDir = "output\episodes\$RunId"
if (-not (Test-Path $runDir)) {
    Write-Host "❌ Run directory not found: $runDir" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Run directory exists" -ForegroundColor Green

# Check TTS input
$ttsInput = "$runDir\debug\tts_input.json"
if (Test-Path $ttsInput) {
    $inputData = Get-Content $ttsInput | ConvertFrom-Json
    Write-Host "`n📥 TTS Input:" -ForegroundColor Cyan
    Write-Host "   Script Length: $($inputData.scriptLength) characters"
    Write-Host "   Word Count: $($inputData.wordCount) words"
    Write-Host "   Voice: $($inputData.voiceId)"
    Write-Host "   Speed: $($inputData.speed)"
} else {
    Write-Host "`n⚠️  TTS input file not found" -ForegroundColor Yellow
}

# Check TTS output
$ttsOutput = "$runDir\debug\tts_output.json"
if (Test-Path $ttsOutput) {
    $outputData = Get-Content $ttsOutput | ConvertFrom-Json
    Write-Host "`n📤 TTS Output:" -ForegroundColor Cyan
    if ($outputData.error) {
        Write-Host "   ❌ Error: $($outputData.error)" -ForegroundColor Red
        Write-Host "   Message: $($outputData.message)" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Audio Size: $($outputData.audioSizeKB) KB"
        Write-Host "   ✅ Duration: $($outputData.durationSeconds) seconds"
    }
} else {
    Write-Host "`n⚠️  TTS output file not found - stage may still be running or failed" -ForegroundColor Yellow
}

# Check TTS error
$ttsError = "$runDir\debug\tts_error.json"
if (Test-Path $ttsError) {
    $errorData = Get-Content $ttsError | ConvertFrom-Json
    Write-Host "`n❌ TTS Error:" -ForegroundColor Red
    Write-Host "   Error: $($errorData.error)"
    Write-Host "   Message: $($errorData.message)"
    if ($errorData.stack) {
        $stackPreview = $errorData.stack.Substring(0, [Math]::Min(200, $errorData.stack.Length))
        Write-Host "   Stack: $stackPreview..."
    }
}

# Check audio file
$audioFile = "$runDir\audio.mp3"
if (Test-Path $audioFile) {
    $audioInfo = Get-Item $audioFile
    Write-Host "`n🎵 Audio File:" -ForegroundColor Cyan
    Write-Host "   ✅ Exists: $($audioInfo.Length) bytes"
    Write-Host "   Created: $($audioInfo.CreationTime)"
} else {
    Write-Host "`n⚠️  Audio file not found" -ForegroundColor Yellow
}

# Check script output
$scriptOutput = "$runDir\debug\script_output.json"
if (Test-Path $scriptOutput) {
    $scriptData = Get-Content $scriptOutput | ConvertFrom-Json
    Write-Host "`n📝 Script Info:" -ForegroundColor Cyan
    $narrativeLength = $scriptData.script.narrative.Length
    Write-Host "   Narrative Length: $narrativeLength characters"
    $wordCount = ($scriptData.script.narrative -split '\s+').Count
    Write-Host "   Word Count: $wordCount words"
    $estimatedChunks = [Math]::Ceiling($narrativeLength / 4000)
    Write-Host "   Estimated Chunks: $estimatedChunks"
}

Write-Host "`n💡 Recommendations:" -ForegroundColor Cyan
if (-not (Test-Path $ttsOutput) -and -not (Test-Path $ttsError)) {
    Write-Host "   1. The TTS stage appears to be stuck" -ForegroundColor Yellow
    Write-Host "   2. Try resuming from TTS stage:" -ForegroundColor White
    Write-Host "      Visit: http://localhost:3000/podcasts/podcast_6bcbdf5b-416c-4475-971f-26d8f71e5176/runs/$RunId" -ForegroundColor White
    Write-Host "      Click 'Resume from TTS'" -ForegroundColor White
    Write-Host "   3. Or check server logs for OpenAI API errors" -ForegroundColor White
    Write-Host "   4. Verify OPENAI_API_KEY is set and valid" -ForegroundColor White
} elseif (Test-Path $ttsError) {
    Write-Host "   1. TTS stage failed - check error details above" -ForegroundColor Red
    Write-Host "   2. Try resuming from TTS stage after fixing the issue" -ForegroundColor White
} else {
    Write-Host "   ✅ TTS stage completed successfully!" -ForegroundColor Green
}

