# Script to find the latest Playwright Lambda layer ARN for your region
# Based on: https://github.com/mxschmitt/playwright-aws-lambda

param(
    [string]$Region = "us-east-1",
    [string]$Runtime = "nodejs18.x"
)

Write-Host "Finding Playwright Lambda Layer for region: $Region, runtime: $Runtime" -ForegroundColor Cyan

# Common layer ARNs (these may need to be updated)
# Check: https://github.com/mxschmitt/playwright-aws-lambda for latest versions

$layerArns = @{
    "us-east-1" = @{
        "nodejs18.x" = "arn:aws:lambda:us-east-1:753240598075:layer:playwright-nodejs18x:1"
        "nodejs20.x" = "arn:aws:lambda:us-east-1:753240598075:layer:playwright-nodejs20x:1"
    }
    "us-west-2" = @{
        "nodejs18.x" = "arn:aws:lambda:us-west-2:753240598075:layer:playwright-nodejs18x:1"
        "nodejs20.x" = "arn:aws:lambda:us-west-2:753240598075:layer:playwright-nodejs20x:1"
    }
    "eu-west-1" = @{
        "nodejs18.x" = "arn:aws:lambda:eu-west-1:753240598075:layer:playwright-nodejs18x:1"
        "nodejs20.x" = "arn:aws:lambda:eu-west-1:753240598075:layer:playwright-nodejs20x:1"
    }
}

if ($layerArns.ContainsKey($Region) -and $layerArns[$Region].ContainsKey($Runtime)) {
    $layerArn = $layerArns[$Region][$Runtime]
    Write-Host "`n✅ Found Playwright Layer ARN:" -ForegroundColor Green
    Write-Host $layerArn -ForegroundColor White
    Write-Host "`nTo use this layer, set the environment variable:" -ForegroundColor Yellow
    Write-Host "`$env:PLAYWRIGHT_LAYER_ARN='$layerArn'" -ForegroundColor Cyan
    Write-Host "`nOr add it to your CDK stack configuration." -ForegroundColor Yellow
    return $layerArn
} else {
    Write-Host "`n❌ Layer ARN not found for region: $Region, runtime: $Runtime" -ForegroundColor Red
    Write-Host "`nPlease check: https://github.com/mxschmitt/playwright-aws-lambda" -ForegroundColor Yellow
    Write-Host "Or use the AWS CLI to find available layers:" -ForegroundColor Yellow
    Write-Host "aws lambda list-layers --region $Region --query 'Layers[?contains(LayerName, `playwright`)].LatestMatchingVersion.LayerVersionArn'" -ForegroundColor Cyan
    return $null
}

