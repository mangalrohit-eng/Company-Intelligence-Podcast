# Deploy Frontend to S3 and CloudFront

Write-Output "`n🚀 Building and Deploying Frontend...`n"

# Get AWS outputs
$API_URL = aws cloudformation describe-stacks --stack-name PodcastPlatformStack --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text
$USER_POOL_ID = aws cloudformation describe-stacks --stack-name PodcastPlatformStack --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text
$CLIENT_ID = aws cloudformation describe-stacks --stack-name PodcastPlatformStack --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text
$BUCKET = aws cloudformation describe-stacks --stack-name PodcastPlatformStack --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text
$CLOUDFRONT_DOMAIN = aws cloudformation describe-stacks --stack-name PodcastPlatformStack --query 'Stacks[0].Outputs[?OutputKey==`DistributionDomain`].OutputValue' --output text

Write-Output "✅ Retrieved AWS configuration:"
Write-Output "   API URL: $API_URL"
Write-Output "   User Pool ID: $USER_POOL_ID"
Write-Output "   Client ID: $CLIENT_ID"
Write-Output "   Frontend Bucket: $BUCKET"
Write-Output "   CloudFront: $CLOUDFRONT_DOMAIN`n"

# Set environment variables for build
$env:NEXT_PUBLIC_API_URL = $API_URL
$env:NEXT_PUBLIC_USER_POOL_ID = $USER_POOL_ID
$env:NEXT_PUBLIC_USER_POOL_CLIENT_ID = $CLIENT_ID
$env:NEXT_PUBLIC_AWS_REGION = "us-east-1"

Write-Output "📦 Building Next.js frontend..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Output "❌ Build failed!"
    exit 1
}

Write-Output "`n✅ Build successful!`n"

Write-Output "📤 Uploading to S3..."
# For Next.js standalone, we need to upload the .next/standalone and static folders
aws s3 sync .next/standalone s3://$BUCKET --delete
aws s3 sync .next/static s3://$BUCKET/_next/static --delete
aws s3 sync public s3://$BUCKET/public --delete

Write-Output "`n✅ Upload complete!`n"

Write-Output "🔄 Invalidating CloudFront cache..."
# Get distribution ID from the domain
$DISTRIBUTION_ID = aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='$(($CLOUDFRONT_DOMAIN -replace 'https://',''))'].Id" --output text

if ($DISTRIBUTION_ID) {
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
    Write-Output "`n✅ Cache invalidation created!`n"
} else {
    Write-Output "`n⚠️  Could not find distribution ID, skipping cache invalidation`n"
}

Write-Output "`n🎉 DEPLOYMENT COMPLETE!`n"
Write-Output "🌐 Your website is live at: $CLOUDFRONT_DOMAIN`n"
Write-Output "⏳ Note: CloudFront distribution may take 5-15 minutes to update globally`n"

