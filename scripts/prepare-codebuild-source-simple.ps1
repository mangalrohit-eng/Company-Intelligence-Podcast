# Prepare source code for CodeBuild - Simple version using Compress-Archive
# Usage: .\scripts\prepare-codebuild-source-simple.ps1

Write-Host "Preparing source code for CodeBuild..." -ForegroundColor Cyan

# Create temp directory
$tempDir = "codebuild-source"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying files..." -ForegroundColor Yellow

# Copy necessary files and directories
$itemsToCopy = @(
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.node.json",
    "buildspec.yml",
    "src",
    "public",
    "containers",
    "scripts"
)

foreach ($item in $itemsToCopy) {
    if (Test-Path $item) {
        if (Test-Path $item -PathType Container) {
            Copy-Item -Path $item -Destination $tempDir -Recurse -Force
        } else {
            Copy-Item -Path $item -Destination $tempDir -Force
        }
    }
}

# Copy config files with wildcards
Get-ChildItem -Path . -Filter "next.config.*" -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName -Destination $tempDir -Force
}
Get-ChildItem -Path . -Filter "tailwind.config.*" -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName -Destination $tempDir -Force
}
Get-ChildItem -Path . -Filter "postcss.config.*" -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName -Destination $tempDir -Force
}

# Create zip file
Write-Host "Creating zip file..." -ForegroundColor Yellow
$zipFile = "source.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# Use Compress-Archive (creates zip with Windows paths, but CodeBuild should handle it)
# The issue is that Compress-Archive uses backslashes, but Docker COPY should still work
# Let's try it and see if CodeBuild/Docker can handle it
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile -Force

Write-Host "Zip created: $zipFile" -ForegroundColor Green

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Host "✅ Source zip created: $zipFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Upload to S3 and trigger build with: .\scripts\trigger-codebuild.ps1" -ForegroundColor Yellow

