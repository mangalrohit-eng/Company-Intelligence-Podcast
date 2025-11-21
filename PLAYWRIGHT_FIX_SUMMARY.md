# Playwright Integration Fix Summary

## Problem
Playwright was not working in Lambda environment. The scrape stage was returning "Google News" as content instead of actual article content for Google News RSS URLs.

## Root Causes
1. **Top-level import issue**: Code was importing `playwright` at the top level, which isn't available in Lambda
2. **Bundler transformation**: The bundler was transforming class names (e.g., `PlaywrightHttpGateway` → `PlaywrightHttpGateway2`), causing "not a constructor" errors
3. **Direct import in scrape stage**: The scrape stage was trying to directly import PlaywrightHttpGateway, which failed due to bundler issues

## Solutions Applied

### 1. Fixed PlaywrightHttpGateway (`src/gateways/http/playwright.ts`)
- Removed top-level `playwright` import
- Made imports dynamic based on environment:
  - Lambda: Uses `playwright-aws-lambda`
  - Local: Uses regular `playwright`
- Added proper error handling and logging

### 2. Updated Scrape Stage (`src/engine/stages/scrape.ts`)
- Changed from direct import to using `GatewayFactory.createHttpGateway()`
- This avoids bundler issues since GatewayFactory already handles the import correctly
- Added proper error handling and fallback

### 3. CDK Configuration (`infra/cdk/lib/podcast-platform-stack.ts`)
- Ensured `playwright-aws-lambda` is bundled (not excluded)
- Excluded regular `playwright` and related packages (not available in Lambda)

## Testing

### Local Test
✅ Playwright works locally - test script confirms it can scrape Google News URLs and get actual content

### Lambda Test
⚠️ Needs verification - Run a new podcast run and check:
1. Lambda logs should show "Initialized Playwright using playwright-aws-lambda for Lambda"
2. Lambda logs should show "Using Playwright with stealth mode for Google News URL"
3. Scrape output should contain actual article content (not just "Google News")
4. Latency should be 3-10 seconds per article (not 100-200ms)

## Next Steps
1. Run a new podcast run with Google News URLs
2. Check CloudWatch logs for Playwright initialization
3. Verify scrape output contains actual content
4. If still not working, check if `playwright-aws-lambda` is properly bundled in the Lambda package

## Files Changed
- `src/gateways/http/playwright.ts` - Dynamic imports, Lambda support
- `src/engine/stages/scrape.ts` - Use GatewayFactory instead of direct import
- `infra/cdk/lib/podcast-platform-stack.ts` - Bundling configuration

