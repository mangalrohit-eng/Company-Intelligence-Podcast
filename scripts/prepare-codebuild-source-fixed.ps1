# Prepare source code for CodeBuild - Fixed version with forward slashes
# Usage: .\scripts\prepare-codebuild-source-fixed.ps1

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

# Create zip file with forward slashes (Linux-compatible)
Write-Host "Creating zip file with forward slashes..." -ForegroundColor Yellow
$zipFile = "source.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# Load required assemblies
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = (Resolve-Path .).Path + "\" + $zipFile
$tempDirFullPath = (Resolve-Path $tempDir).Path

# Ensure tempDir path ends with backslash for proper substring calculation
if (-not $tempDirFullPath.EndsWith('\')) {
    $tempDirFullPath = $tempDirFullPath + '\'
}

# Create zip archive
try {
    $createMode = 1  # ZipArchiveMode.Create = 1
    $zipArchive = [System.IO.Compression.ZipFile]::Open($zipPath, $createMode)
    
    # Add all files with forward slashes
    Get-ChildItem -Path $tempDir -Recurse -File | ForEach-Object {
        $fullPath = $_.FullName
        # Calculate relative path
        if ($fullPath.StartsWith($tempDirFullPath)) {
            $relativePath = $fullPath.Substring($tempDirFullPath.Length)
        } else {
            # Fallback: try replacing the full path
            $relativePath = $fullPath.Replace($tempDirFullPath, '')
        }
        
        # Replace ALL backslashes with forward slashes
        $relativePath = $relativePath.Replace('\', '/')
        
        # Skip if empty
        if ([string]::IsNullOrWhiteSpace($relativePath)) {
            return
        }
        
        try {
            # Create entry and copy file content
            $entry = $zipArchive.CreateEntry($relativePath)
            $entryStream = $entry.Open()
            $fileStream = [System.IO.File]::OpenRead($fullPath)
            $fileStream.CopyTo($entryStream)
            $fileStream.Close()
            $entryStream.Close()
        } catch {
            Write-Warning "Failed to add file: $fullPath (relative: $relativePath) - $_"
        }
    }
    
    $zipArchive.Dispose()
    Write-Host "✅ Zip created with forward slashes (Linux-compatible)" -ForegroundColor Green
} catch {
    Write-Error "Failed to create zip: $_"
    if ($zipArchive) {
        $zipArchive.Dispose()
    }
    exit 1
}

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Host "✅ Source zip created: $zipFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Upload to S3 and trigger build with: .\scripts\trigger-codebuild.ps1" -ForegroundColor Yellow

