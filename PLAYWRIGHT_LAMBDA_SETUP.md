# Playwright Lambda Layer Setup

This guide explains how to set up Playwright in AWS Lambda using a Lambda layer.

## Overview

Playwright requires browser binaries that are too large to include in a Lambda deployment package. Instead, we use a Lambda layer that contains the Playwright browsers.

## Step 1: Find the Correct Layer ARN

Run the helper script to find the Playwright layer ARN for your region:

```powershell
.\scripts\find-playwright-layer.ps1 -Region us-east-1 -Runtime nodejs18.x
```

Or manually check: https://github.com/mxschmitt/playwright-aws-lambda

## Step 2: Set the Layer ARN (Optional)

If the default layer ARN doesn't work for your region, set it as an environment variable before deploying:

```powershell
$env:PLAYWRIGHT_LAYER_ARN="arn:aws:lambda:us-east-1:753240598075:layer:playwright-nodejs18x:1"
```

## Step 3: Deploy

Deploy the CDK stack as usual:

```powershell
cd infra/cdk
npm run deploy
```

The CDK stack will automatically:
- Attach the Playwright Lambda layer to the `pipeline-orchestrator` Lambda
- Set environment variables for Playwright to use browsers from the layer
- Configure the Lambda with sufficient memory (3008 MB) for Playwright

## Step 4: Verify

After deployment, verify the layer is attached:

```powershell
aws lambda get-function-configuration --function-name pipeline-orchestrator --query 'Layers'
```

You should see the Playwright layer ARN in the output.

## Troubleshooting

### Layer Not Found Error

If you get a "Layer not found" error:
1. Check that the layer ARN is correct for your region
2. Verify the layer exists: `aws lambda get-layer-version --layer-name arn:aws:lambda:us-east-1:753240598075:layer:playwright-nodejs18x:1`
3. Update the layer ARN in the CDK stack or via environment variable

### Playwright Not Working

If Playwright fails at runtime:
1. Check Lambda logs: `aws logs tail /aws/lambda/pipeline-orchestrator --follow`
2. Verify environment variables are set:
   - `PLAYWRIGHT_BROWSERS_PATH=/opt/playwright`
   - `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
3. Ensure Lambda has enough memory (3008 MB is configured)

### Alternative: Use playwright-aws-lambda Package

If the layer approach doesn't work, you can use the `playwright-aws-lambda` npm package instead:

```bash
npm install playwright-aws-lambda
```

Then update `src/gateways/http/playwright.ts` to use:
```typescript
import playwright from 'playwright-aws-lambda';
```

This package handles the Lambda setup automatically but may have different API.

## Resources

- [Playwright AWS Lambda Layer](https://github.com/mxschmitt/playwright-aws-lambda)
- [Playwright AWS Lambda Package](https://www.npmjs.com/package/playwright-aws-lambda)
- [AWS Lambda Layers Documentation](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)

