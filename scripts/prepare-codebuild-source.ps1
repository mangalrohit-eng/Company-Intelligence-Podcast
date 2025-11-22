# Prepare source code for CodeBuild
# Usage: .\scripts\prepare-codebuild-source.ps1

Write-Host "Preparing source code for CodeBuild..." -ForegroundColor Cyan

# Create temp directory
$tempDir = "codebuild-source"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying files..." -ForegroundColor Yellow

# Copy necessary files
$filesToCopy = @(
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.node.json",
    "next.config.*",
    "tailwind.config.*",
    "postcss.config.*",
    "src",
    "public",
    "containers",
    "scripts"
)

foreach ($pattern in $filesToCopy) {
    if ($pattern -like "*.*") {
        # It's a file pattern
        Get-ChildItem -Path . -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $tempDir -Force
        }
    } else {
        # It's a directory
        if (Test-Path $pattern) {
            Copy-Item -Path $pattern -Destination $tempDir -Recurse -Force
        }
    }
}

# Copy buildspec.yml
Copy-Item "buildspec.yml" -Destination $tempDir -Force

# Create zip file with forward slashes (Linux-compatible)
Write-Host "Creating zip file..." -ForegroundColor Yellow
$zipFile = "source.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# Use .NET ZipFile to ensure forward slashes for cross-platform compatibility
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path (Resolve-Path .).Path $zipFile
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Open zip archive for writing
# Try to use enum, fallback to integer if enum not available
try {
    $createMode = [System.IO.Compression.ZipArchiveMode]::Create
} catch {
    # Fallback: Create mode = 1
    $createMode = 1
}
$zipArchive = [System.IO.Compression.ZipFile]::Open($zipPath, $createMode)

# Get the full path of temp directory for relative path calculation
$tempDirFullPath = (Resolve-Path $tempDir).Path
# Ensure it ends with a separator for proper substring calculation
if (-not $tempDirFullPath.EndsWith('\')) {
    $tempDirFullPath = $tempDirFullPath + '\'
}

# Add all files with forward slashes in paths (relative to tempDir)
Get-ChildItem -Path $tempDir -Recurse -File | ForEach-Object {
    $fullPath = $_.FullName
    # Calculate relative path manually
    if ($fullPath.StartsWith($tempDirFullPath)) {
        $relativePath = $fullPath.Substring($tempDirFullPath.Length)
    } else {
        # Fallback: try to get relative path using PowerShell's relative path
        $relativePath = $_.FullName.Replace($tempDirFullPath, '')
    }
    
    # Replace backslashes with forward slashes
    $relativePath = $relativePath.Replace('\', '/')
    
    # Ensure we have a valid relative path
    if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = $_.Name
    }
    
    # Only add if we have a valid relative path
    if ($relativePath -and $relativePath.Trim().Length -gt 0) {
        try {
            $entry = $zipArchive.CreateEntry($relativePath)
            $entryStream = $entry.Open()
            $fileStream = [System.IO.File]::OpenRead($fullPath)
            $fileStream.CopyTo($entryStream)
            $fileStream.Close()
            $entryStream.Close()
        } catch {
            Write-Warning "Failed to add file: $fullPath (relative: $relativePath) - $_"
        }
    } else {
        Write-Warning "Skipping file with empty relative path: $fullPath"
    }
}

if ($zipArchive) {
    $zipArchive.Dispose()
}
Write-Host "Zip created with forward slashes (Linux-compatible)" -ForegroundColor Green

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Host "✅ Source zip created: $zipFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Upload to S3 and trigger build with: .\scripts\trigger-codebuild.ps1" -ForegroundColor Yellow

