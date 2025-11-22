# CodeBuild Source Zip Format - Reference Guide

## ✅ Working Format

The source zip file must use **forward slashes (`/`)** for all paths to be compatible with Linux-based CodeBuild environments.

### Key Requirements:

1. **Path Separators**: Use forward slashes (`/`) not backslashes (`\`)
2. **Relative Paths**: All paths must be relative to the zip root
3. **Directory Structure**: 
   - `Dockerfile` at root
   - `buildspec.yml` at root
   - `src/` directory at root
   - `containers/` directory at root
   - `scripts/` directory at root
   - `public/` directory at root (if exists)

## Creating the Source Zip

### Use the Automated Script (Recommended):

```powershell
.\scripts\prepare-codebuild-source.ps1
```

This script:
- ✅ Creates a Linux-compatible zip with forward slashes
- ✅ Includes all necessary files and directories
- ✅ Uses relative paths

### Manual Upload:

After running the prepare script, upload to S3:

```powershell
aws s3 cp source.zip s3://podcast-platform-source-bucket-098478926952/source.zip --region us-east-1
```

## Current Working Source File

**Location**: `s3://podcast-platform-source-bucket-098478926952/source.zip`

**Last Updated**: 2025-11-22

**Format**: Linux-compatible (forward slashes, relative paths)

## Verification

To verify the zip format is correct:

```powershell
# Check for backslashes (should find none)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("source.zip")
$hasBackslash = $zip.Entries | Where-Object { $_.FullName -like "*\*" } | Select-Object -First 1
if ($hasBackslash) {
    Write-Host "❌ WARNING: Zip contains backslashes!" -ForegroundColor Red
} else {
    Write-Host "✅ Zip uses forward slashes (correct format)" -ForegroundColor Green
}
$zip.Dispose()
```

## What's Included in the Source Zip

- `Dockerfile` - Container build instructions
- `buildspec.yml` - CodeBuild build specification
- `package.json` & `package-lock.json` - Node.js dependencies
- `tsconfig.json` & `tsconfig.node.json` - TypeScript configuration
- `next.config.*` - Next.js configuration files
- `tailwind.config.*` - Tailwind CSS configuration
- `postcss.config.*` - PostCSS configuration
- `src/` - Source code directory
- `containers/` - Container definitions
- `scripts/` - Build and deployment scripts
- `public/` - Public assets (if exists)

## Troubleshooting

### If build fails with "directory not found":
1. Verify zip uses forward slashes (see verification above)
2. Recreate zip using the prepare script
3. Re-upload to S3

### If YAML errors occur:
- Check `buildspec.yml` for proper YAML syntax
- Avoid colons in echo messages
- Use simple strings without special characters

## Going Forward

**Always use**: `.\scripts\prepare-codebuild-source.ps1`

This ensures the correct format is maintained every time.

