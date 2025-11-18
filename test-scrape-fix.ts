/**
 * Test Script: Scrape Stage Fix Verification
 * Tests that scraping actually processes URLs and tracks success/failure counts
 * 
 * Run with: npx tsx test-scrape-fix.ts
 */

import { ScrapeStage } from './src/engine/stages/scrape';
import { PlaywrightHttpGateway } from './src/gateways/http/playwright';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Mock discovery items (5 URLs to test)
const mockRankedItems = [
  {
    url: 'https://www.reuters.com/business/finance/citibank-announces-new-digital-banking-features-2024-01-15/',
    title: 'Citibank Announces New Digital Banking Features',
    publisher: 'Reuters',
    publishedDate: new Date().toISOString(),
    topicIds: ['company-news'],
    entityIds: ['Citibank'],
    scores: {
      relevance: 0.9,
      recency: 0.8,
      authority: 0.9,
    },
  },
  {
    url: 'https://www.bloomberg.com/news/articles/2024-01-14/citibank-expands-asia-pacific-operations',
    title: 'Citibank Expands Asia-Pacific Operations',
    publisher: 'Bloomberg',
    publishedDate: new Date().toISOString(),
    topicIds: ['company-news'],
    entityIds: ['Citibank'],
    scores: {
      relevance: 0.85,
      recency: 0.75,
      authority: 0.95,
    },
  },
  {
    url: 'https://www.ft.com/content/invalid-url-test-404',
    title: 'Test 404 URL',
    publisher: 'Financial Times',
    publishedDate: new Date().toISOString(),
    topicIds: ['company-news'],
    entityIds: ['Citibank'],
    scores: {
      relevance: 0.7,
      recency: 0.6,
      authority: 0.8,
    },
  },
  {
    url: 'https://invalid-domain-that-does-not-exist-12345.com/article',
    title: 'Invalid Domain Test',
    publisher: 'Unknown',
    publishedDate: new Date().toISOString(),
    topicIds: ['company-news'],
    entityIds: ['Citibank'],
    scores: {
      relevance: 0.5,
      recency: 0.4,
      authority: 0.3,
    },
  },
  {
    url: 'https://www.wsj.com/articles/citibank-q4-earnings-beat-expectations',
    title: 'Citibank Q4 Earnings Beat Expectations',
    publisher: 'Wall Street Journal',
    publishedDate: new Date().toISOString(),
    topicIds: ['company-news'],
    entityIds: ['Citibank'],
    scores: {
      relevance: 0.95,
      recency: 0.9,
      authority: 0.95,
    },
  },
];

// Topic targets
const topicTargets = {
  'company-news': { targetUnits: 5 },
};

// Event emitter that logs to console and file
const logMessages: Array<{
  timestamp: string;
  stage: string;
  progress: number;
  message: string;
  level: string;
  data: string;
}> = [];

class TestEventEmitter {
  async emit(stage: string, progress: number, message: string, level: string = 'info', data: any = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      stage,
      progress,
      message,
      level,
      data: JSON.stringify(data),
    };
    logMessages.push(logEntry);
    console.log(`[${stage}] ${progress}% - ${message}`, data);
  }
  
  setSubstage(substage: string): void {}
  clearSubstage(): void {}
}

async function testScrapeStage() {
  console.log('🧪 Starting Scrape Stage Test...\n');
  console.log(`📋 Test Items: ${mockRankedItems.length} URLs\n`);

  // Create HTTP gateway (using Playwright for real scraping)
  const httpGateway = new PlaywrightHttpGateway();
  
  // Create event emitter
  const emitter = new TestEventEmitter() as any;
  
  // Create scrape stage
  const scrapeStage = new ScrapeStage(httpGateway);

  try {
    // Execute scrape stage
    const startTime = Date.now();
    const output = await scrapeStage.execute(
      mockRankedItems,
      topicTargets,
      'permissive',
      emitter,
      {
        timeCapMinutes: 5, // Short timeout for testing
        fetchCap: 10,
      }
    );
    const duration = Date.now() - startTime;

    // Prepare test results
    const testResults = {
      testName: 'Scrape Stage Fix Verification',
      timestamp: new Date().toISOString(),
      durationMs: duration,
      input: {
        totalUrls: mockRankedItems.length,
        topicCount: Object.keys(topicTargets).length,
      },
      output: {
        stopReason: output.stopReason,
        stats: output.stats,
        contentCount: output.contents.length,
      },
      logs: logMessages,
      verdict: {
        passed: false,
        issues: [] as string[],
      },
    };

    // Verify results
    const issues: string[] = [];
    
    // Check 1: Loop should have processed items
    if (output.stats.totalUrls !== mockRankedItems.length) {
      issues.push(`❌ totalUrls mismatch: expected ${mockRankedItems.length}, got ${output.stats.totalUrls}`);
    } else {
      console.log(`✅ totalUrls correct: ${output.stats.totalUrls}`);
    }

    // Check 2: Should have some success or failure (not both 0)
    if (output.stats.successCount === 0 && output.stats.failureCount === 0) {
      issues.push('❌ CRITICAL: Both successCount and failureCount are 0 - loop did not process any items!');
    } else {
      console.log(`✅ Items processed: ${output.stats.successCount} success, ${output.stats.failureCount} failures`);
    }

    // Check 3: Should have attempted to scrape
    const totalAttempted = output.stats.successCount + output.stats.failureCount;
    if (totalAttempted === 0) {
      issues.push('❌ CRITICAL: No items were attempted - loop broke immediately!');
    } else {
      console.log(`✅ Total items attempted: ${totalAttempted}`);
    }

    // Check 4: Should have some content or failures
    if (output.contents.length === 0 && output.stats.failureCount === 0) {
      issues.push('⚠️  No content scraped and no failures recorded - suspicious');
    }

    // Check 5: Stop reason should be reasonable
    if (output.stopReason === 'targets_met' && totalAttempted === 0) {
      issues.push('❌ Stop reason is "targets_met" but no items were processed!');
    }

    testResults.verdict.issues = issues;
    testResults.verdict.passed = issues.length === 0;

    // Print summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 TEST RESULTS:\n');
    console.log(`   Total URLs: ${output.stats.totalUrls}`);
    console.log(`   Success Count: ${output.stats.successCount}`);
    console.log(`   Failure Count: ${output.stats.failureCount}`);
    console.log(`   Content Count: ${output.contents.length}`);
    console.log(`   Stop Reason: ${output.stopReason}`);
    console.log(`   Duration: ${duration}ms\n`);

    if (testResults.verdict.passed) {
      console.log('✅ TEST PASSED: Scrape stage is working correctly!\n');
    } else {
      console.log('❌ TEST FAILED: Issues found:\n');
      issues.forEach(issue => console.log(`   ${issue}\n`));
    }

    // Save results to file
    const resultsPath = join(process.cwd(), 'test-scrape-results.json');
    await writeFile(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`💾 Results saved to: ${resultsPath}\n`);

    // Save logs to file
    const logsPath = join(process.cwd(), 'test-scrape-logs.json');
    await writeFile(logsPath, JSON.stringify(logMessages, null, 2));
    console.log(`📝 Logs saved to: ${logsPath}\n`);

    return testResults;

  } catch (error: any) {
    console.error('❌ Test failed with exception:', error);
    const errorResults = {
      testName: 'Scrape Stage Fix Verification',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      logs: logMessages,
    };
    
    const errorPath = join(process.cwd(), 'test-scrape-error.json');
    await writeFile(errorPath, JSON.stringify(errorResults, null, 2));
    console.log(`💾 Error details saved to: ${errorPath}\n`);
    
    throw error;
  } finally {
    // Cleanup
    if (httpGateway && typeof (httpGateway as any).close === 'function') {
      await (httpGateway as any).close();
    }
  }
}

// Run the test
testScrapeStage()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

