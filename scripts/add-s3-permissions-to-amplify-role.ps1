# PowerShell script to add S3 permissions to Amplify service role
# Run this script to grant S3 read access to the Amplify SSR role

$roleName = "AmplifySSRLoggingRole-d4163bca-a763-4c44-8dfc-ca8ef9448570"
$bucketName = "podcast-platform-media-098478926952"
$policyName = "AmplifyS3ReadAccess"

Write-Host "Creating IAM policy for S3 access..." -ForegroundColor Cyan

# Create the policy document (save to temp file)
$tempPolicyFile = "$env:TEMP\amplify-s3-policy.json"
$policyDocument = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Action = @(
                "s3:GetObject",
                "s3:ListBucket"
            )
            Resource = @(
                "arn:aws:s3:::$bucketName",
                "arn:aws:s3:::$bucketName/*"
            )
        }
    )
} | ConvertTo-Json -Depth 10 -Compress

# Save to file (AWS CLI needs a file, not a string)
$policyDocument | Out-File -FilePath $tempPolicyFile -Encoding utf8 -NoNewline

# Create the policy
Write-Host "Creating policy: $policyName" -ForegroundColor Yellow
try {
    $createPolicyResult = aws iam create-policy `
        --policy-name $policyName `
        --policy-document file://$tempPolicyFile `
        --region us-east-1 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $policyArn = ($createPolicyResult | ConvertFrom-Json).Policy.Arn
        Write-Host "✅ Policy created: $policyArn" -ForegroundColor Green
    } else {
        # Policy might already exist
        if ($createPolicyResult -match "EntityAlreadyExists") {
            Write-Host "⚠️  Policy already exists, getting ARN..." -ForegroundColor Yellow
            $policyArn = "arn:aws:iam::098478926952:policy/$policyName"
        } else {
            Write-Host "❌ Failed to create policy: $createPolicyResult" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "❌ Error creating policy: $_" -ForegroundColor Red
    exit 1
}

# Attach policy to role
Write-Host "`nAttaching policy to role: $roleName" -ForegroundColor Yellow
try {
    aws iam attach-role-policy `
        --role-name $roleName `
        --policy-arn $policyArn `
        --region us-east-1 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Policy attached successfully!" -ForegroundColor Green
        Write-Host "`n✅ Done! The Amplify service role now has S3 read access." -ForegroundColor Green
        Write-Host "   Wait a few minutes for changes to propagate, then test accessing a debug JSON file." -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Policy might already be attached (this is OK)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error attaching policy: $_" -ForegroundColor Red
    exit 1
}

# Clean up temp file
if (Test-Path $tempPolicyFile) {
    Remove-Item $tempPolicyFile -Force
}

