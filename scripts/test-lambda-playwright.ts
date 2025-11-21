/**
 * Test script to verify Playwright works in Lambda environment
 * This simulates what happens in Lambda by setting AWS_LAMBDA_FUNCTION_NAME
 */

import 'dotenv/config';

// Simulate Lambda environment
process.env.AWS_LAMBDA_FUNCTION_NAME = 'test-lambda-function';

async function testLambdaPlaywright() {
  console.log('🧪 Testing Playwright in Lambda Environment\n');
  console.log('='.repeat(80));
  console.log('');

  // Test 1: Check playwright-aws-lambda availability
  console.log('Test 1: Check playwright-aws-lambda availability');
  console.log('-'.repeat(80));
  try {
    const playwrightAws = await import('playwright-aws-lambda');
    console.log('  ✅ playwright-aws-lambda is available');
    console.log(`  Exports: ${Object.keys(playwrightAws).join(', ')}`);
    
    // Check if launchChromium exists
    if (typeof playwrightAws.launchChromium === 'function') {
      console.log('  ✅ launchChromium function found');
    } else {
      console.log('  ❌ launchChromium function not found');
      console.log(`  Available: ${Object.keys(playwrightAws)}`);
    }
  } catch (error: any) {
    console.log(`  ❌ playwright-aws-lambda not available: ${error.message}`);
    console.log(`  Error stack: ${error.stack}`);
    return;
  }
  console.log('');

  // Test 2: Import PlaywrightHttpGateway
  console.log('Test 2: Import PlaywrightHttpGateway');
  console.log('-'.repeat(80));
  let PlaywrightGateway: any = null;
  try {
    const module = await import('../src/gateways/http/playwright');
    PlaywrightGateway = module.PlaywrightHttpGateway;
    console.log('  ✅ Successfully imported PlaywrightHttpGateway');
    console.log(`  Module exports: ${Object.keys(module).join(', ')}`);
  } catch (error: any) {
    console.log(`  ❌ Failed to import: ${error.message}`);
    return;
  }
  console.log('');

  // Test 3: Create instance and initialize
  console.log('Test 3: Create and Initialize PlaywrightHttpGateway');
  console.log('-'.repeat(80));
  let gateway: any = null;
  try {
    gateway = new PlaywrightGateway();
    console.log('  ✅ Instance created');
    
    await gateway.initialize();
    console.log('  ✅ Initialized successfully');
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`);
    console.log(`  Error name: ${error.name}`);
    console.log(`  Error stack: ${error.stack}`);
    return;
  }
  console.log('');

  // Test 4: Fetch a Google News URL
  console.log('Test 4: Fetch Google News URL');
  console.log('-'.repeat(80));
  const testUrl = 'https://news.google.com/rss/articles/CBMingFBVV95cUxORTBFWm5YS3VzZ2VremNZMjVNbjRrTG95RE0teDROU2UwbWp6LUNzY0o4TmpHbTBzZ0Naa2tsLS02bXRFSk1PTWZQNFh1RFFBc1dYVl9NYmxZc0t3YmxtaURxQmJoMVlEUWFxbXNlSE1kbURiYngyckFlRllXNkRDUXFBR25aQUxrTHd3dFRGTkptVzdkS0lrOG1WWHh3dw?oc=5';
  try {
    const startTime = Date.now();
    const response = await gateway.fetch({ url: testUrl, timeout: 30000 });
    const latencyMs = Date.now() - startTime;

    console.log(`  ✅ Fetch successful in ${latencyMs}ms`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Final URL: ${response.url}`);
    console.log(`  Body length: ${response.body.length} chars`);

    const textContent = response.body
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);

    if (textContent.length > 200 && !textContent.toLowerCase().includes('google news')) {
      console.log('  ✅ SUCCESS: Got actual article content!');
      console.log(`  Content preview: ${textContent.substring(0, 200)}...`);
    } else {
      console.log('  ⚠️  Got minimal or "Google News" content');
    }
  } catch (error: any) {
    console.log(`  ❌ Fetch failed: ${error.message}`);
    console.log(`  Error stack: ${error.stack}`);
  } finally {
    try {
      await gateway.close();
    } catch (e) {
      // Ignore
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ Lambda environment test completed!');
}

testLambdaPlaywright().catch(console.error);

