/**
 * End-to-end test to verify Playwright works in the pipeline
 * This simulates the exact flow that happens in Lambda
 */

import 'dotenv/config';
import { ScrapeStage } from '../src/engine/stages/scrape';
import { PlaywrightHttpGateway } from '../src/gateways/http/playwright';
import { NodeFetchHttpGateway } from '../src/gateways/http/node-fetch';
import { logger } from '../src/utils/logger';

// Mock event emitter
class TestEventEmitter {
  async emit(stage: string, progress: number, message: string, level?: string, data?: any): Promise<void> {
    console.log(`[${stage}] ${progress}%: ${message}`);
    if (data) {
      console.log(`  Data:`, JSON.stringify(data, null, 2));
    }
  }
  markStageCompleted(stage: string, output?: any): Promise<void> {
    return this.emit(stage, 100, `Stage ${stage} completed`, 'info', output);
  }
  clearSubstage(): void {}
}

// Test data - Google News URLs
const testItems = [
  {
    url: 'https://news.google.com/rss/articles/CBMingFBVV95cUxORTBFWm5YS3VzZ2VremNZMjVNbjRrTG95RE0teDROU2UwbWp6LUNzY0o4TmpHbTBzZ0Naa2tsLS02bXRFSk1PTWZQNFh1RFFBc1dYVl9NYmxZc0t3YmxtaURxQmJoMVlEUWFxbXNlSE1kbURiYngyckFlRllXNkRDUXFBR25aQUxrTHd3dFRGTkptVzdkS0lrOG1WWHh3dw?oc=5',
    title: 'Test Article 1',
    publisher: 'Test Publisher',
    publishedDate: new Date().toUTCString(),
    topicIds: ['test-topic-1'],
    entityIds: ['Test Entity'],
    scores: {
      relevance: 0.9,
      recency: 0.8,
      authority: 0.7,
      expectedInfoGain: 0.6,
    },
    rankScore: 0.85,
    expectedInfoGain: 0.6,
    rankingFactors: {
      R: 0.9,
      F: 0.8,
      A: 0.7,
      D: 0.6,
      S: 0.9,
      C: 4.0,
    },
  },
];

async function testPlaywrightInPipeline() {
  console.log('🧪 End-to-End Playwright Pipeline Test\n');
  console.log('='.repeat(80));
  console.log('');

  // Test 1: Check if we're in Lambda environment
  console.log('Test 1: Environment Check');
  console.log('-'.repeat(80));
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  console.log(`  AWS_LAMBDA_FUNCTION_NAME: ${process.env.AWS_LAMBDA_FUNCTION_NAME || 'NOT SET'}`);
  console.log(`  Detected as Lambda: ${isLambda}`);
  console.log('');

  // Test 2: Try to import PlaywrightHttpGateway
  console.log('Test 2: Import PlaywrightHttpGateway');
  console.log('-'.repeat(80));
  let PlaywrightGateway: any = null;
  try {
    const module = await import('../src/gateways/http/playwright');
    PlaywrightGateway = module.PlaywrightHttpGateway;
    console.log('  ✅ Successfully imported PlaywrightHttpGateway');
  } catch (error: any) {
    console.log(`  ❌ Failed to import: ${error.message}`);
    console.log(`  Error stack: ${error.stack}`);
    return;
  }
  console.log('');

  // Test 3: Try to create PlaywrightHttpGateway instance
  console.log('Test 3: Create PlaywrightHttpGateway Instance');
  console.log('-'.repeat(80));
  let playwrightGateway: any = null;
  try {
    playwrightGateway = new PlaywrightGateway();
    console.log('  ✅ Successfully created PlaywrightHttpGateway instance');
  } catch (error: any) {
    console.log(`  ❌ Failed to create instance: ${error.message}`);
    return;
  }
  console.log('');

  // Test 4: Try to initialize Playwright
  console.log('Test 4: Initialize Playwright');
  console.log('-'.repeat(80));
  try {
    await playwrightGateway.initialize();
    console.log('  ✅ Successfully initialized Playwright');
  } catch (error: any) {
    console.log(`  ❌ Failed to initialize: ${error.message}`);
    console.log(`  Error name: ${error.name}`);
    console.log(`  Error stack: ${error.stack}`);
    
    // Check if playwright-aws-lambda is available
    if (isLambda) {
      console.log('\n  Checking playwright-aws-lambda availability...');
      try {
        const playwrightAws = await import('playwright-aws-lambda');
        console.log('  ✅ playwright-aws-lambda is available');
        console.log(`  Exports: ${Object.keys(playwrightAws).join(', ')}`);
      } catch (importError: any) {
        console.log(`  ❌ playwright-aws-lambda not available: ${importError.message}`);
      }
    }
    return;
  }
  console.log('');

  // Test 5: Test fetching a Google News URL
  console.log('Test 5: Fetch Google News URL with Playwright');
  console.log('-'.repeat(80));
  const testUrl = testItems[0].url;
  console.log(`  URL: ${testUrl}`);
  try {
    const startTime = Date.now();
    const response = await playwrightGateway.fetch({
      url: testUrl,
      timeout: 30000,
    });
    const latencyMs = Date.now() - startTime;

    console.log(`  ✅ Fetch successful in ${latencyMs}ms`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Final URL: ${response.url}`);
    console.log(`  Redirected: ${response.url !== testUrl}`);
    console.log(`  Body length: ${response.body.length} characters`);

    // Extract text content
    const textContent = response.body
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);

    console.log(`  Content preview (first 500 chars): ${textContent.substring(0, 200)}...`);

    if (textContent.toLowerCase().includes('google news') && textContent.length < 200) {
      console.log('  ⚠️  WARNING: Only got "Google News" - Playwright may not have followed redirects');
    } else if (textContent.length > 200) {
      console.log('  ✅ SUCCESS: Got substantial content - Playwright is working!');
    }

  } catch (error: any) {
    console.log(`  ❌ Fetch failed: ${error.message}`);
    console.log(`  Error name: ${error.name}`);
    console.log(`  Error stack: ${error.stack}`);
    return;
  }
  console.log('');

  // Test 6: Test ScrapeStage with Playwright
  console.log('Test 6: Test ScrapeStage with Playwright');
  console.log('-'.repeat(80));
  try {
    const scrapeStage = new ScrapeStage(playwrightGateway);
    const emitter = new TestEventEmitter() as any;
    
    const startTime = Date.now();
    const output = await scrapeStage.execute(
      testItems,
      { 'test-topic-1': { targetUnits: 1 } },
      'permissive',
      emitter,
      {
        timeCapMinutes: 5,
        fetchCap: 1,
      }
    );
    const duration = Date.now() - startTime;

    console.log(`  ✅ ScrapeStage completed in ${duration}ms`);
    console.log(`  Contents scraped: ${output.contents.length}`);
    console.log(`  Success count: ${output.stats.successCount}`);
    console.log(`  Failure count: ${output.stats.failureCount}`);
    console.log(`  Average latency: ${output.stats.avgLatencyMs}ms`);

    if (output.contents.length > 0) {
      const firstContent = output.contents[0];
      console.log(`  First content:`);
      console.log(`    URL: ${firstContent.url}`);
      console.log(`    Content length: ${firstContent.content.length} chars`);
      console.log(`    Content preview: ${firstContent.content.substring(0, 200)}...`);
      console.log(`    Latency: ${firstContent.latencyMs}ms`);

      if (firstContent.content.toLowerCase().includes('google news') && firstContent.content.length < 200) {
        console.log('  ⚠️  WARNING: Content is just "Google News" - Playwright not working');
      } else if (firstContent.content.length > 200) {
        console.log('  ✅ SUCCESS: Got actual article content!');
      }
    }

  } catch (error: any) {
    console.log(`  ❌ ScrapeStage failed: ${error.message}`);
    console.log(`  Error name: ${error.name}`);
    console.log(`  Error stack: ${error.stack}`);
    return;
  } finally {
    try {
      await playwrightGateway.close();
    } catch (closeError) {
      // Ignore close errors
    }
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('✅ All tests completed!');
}

// Run the test
testPlaywrightInPipeline().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

