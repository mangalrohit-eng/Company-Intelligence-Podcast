# PowerShell script to fix CloudFront distribution pointing to wrong bucket
# This updates the CloudFront distribution to point to the frontend bucket

Write-Host "Fixing CloudFront Distribution..." -ForegroundColor Cyan

$distributionId = "EWOR6B4JSLK4"
$frontendBucket = "podcast-platform-frontend-098478926952"

Write-Host "Getting current CloudFront configuration..." -ForegroundColor Yellow
$distConfig = aws cloudfront get-distribution-config --id $distributionId --output json | ConvertFrom-Json

# Update the origin to point to frontend bucket
$distConfig.DistributionConfig.Origins.Items[0].DomainName = "$frontendBucket.s3.us-east-1.amazonaws.com"
$distConfig.DistributionConfig.Origins.Items[0].Id = "origin-frontend"

# Save updated config to temp file
$tempFile = "cloudfront-config-temp.json"
$distConfig.DistributionConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile -Encoding utf8

Write-Host "Updating CloudFront distribution..." -ForegroundColor Yellow
Write-Host "NOTE: This requires manual steps in AWS Console:" -ForegroundColor Red
Write-Host "1. Go to CloudFront Console" -ForegroundColor White
Write-Host "2. Select distribution: $distributionId" -ForegroundColor White
Write-Host "3. Edit Origins and change default origin to: $frontendBucket.s3.us-east-1.amazonaws.com" -ForegroundColor White
Write-Host "4. Save changes" -ForegroundColor White
Write-Host ""
Write-Host "OR redeploy CDK stack to fix automatically:" -ForegroundColor Yellow
Write-Host "  npm run deploy" -ForegroundColor Cyan

Remove-Item $tempFile -ErrorAction SilentlyContinue

