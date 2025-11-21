/**
 * End-to-End Test for Playwright in Lambda Pipeline
 * This script monitors a real run to verify Playwright is working
 */

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REGION = process.env.REGION || 'us-east-1';
const RUNS_TABLE = process.env.RUNS_TABLE || 'runs';
const PODCASTS_TABLE = process.env.PODCASTS_TABLE || 'podcasts';

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION })
);

interface Run {
  id: string;
  podcastId: string;
  status: string;
  progress?: {
    stages?: Record<string, any>;
  };
}

async function waitForRun(runId: string, timeoutMs: number = 300000): Promise<Run> {
  const startTime = Date.now();
  console.log(`\n⏳ Waiting for run ${runId} to complete (timeout: ${timeoutMs / 1000}s)...\n`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await dynamoClient.send(
        new GetCommand({
          TableName: RUNS_TABLE,
          Key: { id: runId },
        })
      );

      const run = result.Item as Run;
      if (!run) {
        throw new Error(`Run ${runId} not found`);
      }

      console.log(`  Status: ${run.status}`);
      
      if (run.status === 'completed') {
        console.log('  ✅ Run completed!\n');
        return run;
      } else if (run.status === 'failed') {
        console.log('  ❌ Run failed!\n');
        return run;
      }

      // Show stage progress
      if (run.progress?.stages) {
        const stages = Object.entries(run.progress.stages);
        const activeStages = stages.filter(([_, stage]: [string, any]) => 
          stage.status === 'running' || stage.status === 'completed'
        );
        if (activeStages.length > 0) {
          console.log(`  Active stages: ${activeStages.map(([name, stage]: [string, any]) => 
            `${name} (${stage.status})`
          ).join(', ')}`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    } catch (error: any) {
      console.error(`  Error checking run: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  throw new Error(`Run ${runId} did not complete within ${timeoutMs / 1000} seconds`);
}

async function checkScrapeOutput(runId: string): Promise<boolean> {
  console.log('📄 Checking scrape output...\n');
  
  try {
    const { stdout } = await execAsync(
      `aws s3 cp s3://podcast-platform-media-098478926952/runs/${runId}/debug/scrape_output.json -`
    );
    
    const output = JSON.parse(stdout);
    
    if (!output.contents || output.contents.length === 0) {
      console.log('  ❌ No scraped contents found');
      return false;
    }

    console.log(`  ✅ Found ${output.contents.length} scraped items`);
    console.log(`  Average latency: ${output.stats.avgLatencyMs}ms`);
    console.log(`  Success count: ${output.stats.successCount}`);
    console.log(`  Failure count: ${output.stats.failureCount}\n`);

    // Check first few items for actual content
    let hasRealContent = false;
    let googleNewsOnly = 0;
    
    for (let i = 0; i < Math.min(3, output.contents.length); i++) {
      const item = output.contents[i];
      const content = item.content || '';
      const contentLength = content.length;
      const isGoogleNews = content.toLowerCase().trim() === 'google news' || 
                          (content.toLowerCase().includes('google news') && contentLength < 200);
      
      console.log(`  Item ${i + 1}:`);
      console.log(`    URL: ${item.url.substring(0, 80)}...`);
      console.log(`    Content length: ${contentLength} chars`);
      console.log(`    Latency: ${item.latencyMs}ms`);
      
      if (isGoogleNews) {
        console.log(`    ⚠️  Content is "Google News" only`);
        googleNewsOnly++;
      } else if (contentLength > 200) {
        console.log(`    ✅ Has real content (preview: ${content.substring(0, 100)}...)`);
        hasRealContent = true;
      } else {
        console.log(`    ⚠️  Content too short (${contentLength} chars)`);
      }
      console.log('');
    }

    // Check latency - Playwright should take 3-10 seconds per article
    const avgLatency = output.stats.avgLatencyMs;
    const usingPlaywright = avgLatency > 2000; // More than 2 seconds suggests Playwright
    
    if (usingPlaywright) {
      console.log(`  ✅ High latency (${avgLatency}ms) suggests Playwright is being used`);
    } else {
      console.log(`  ⚠️  Low latency (${avgLatency}ms) suggests Playwright may not be used`);
    }

    return hasRealContent && googleNewsOnly === 0;
  } catch (error: any) {
    console.error(`  ❌ Error checking scrape output: ${error.message}`);
    if (error.message.includes('NoSuchKey')) {
      console.error('  File not found in S3 - scrape may not have completed yet');
    }
    return false;
  }
}

async function checkLambdaLogs(runId: string): Promise<boolean> {
  console.log('📋 Checking Lambda logs for Playwright usage...\n');
  
  try {
    // Get logs from the last hour
    const { stdout } = await execAsync(
      `aws logs tail /aws/lambda/pipeline-orchestrator --since 1h --format short`
    );
    
    const lines = stdout.split('\n');
    const relevantLines = lines.filter(line => 
      line.includes('Playwright') || 
      line.includes('playwright-aws-lambda') ||
      line.includes('Using Playwright') ||
      line.includes('Initialized Playwright') ||
      line.includes('Google News URL')
    );

    if (relevantLines.length === 0) {
      console.log('  ⚠️  No Playwright-related log entries found');
      return false;
    }

    console.log(`  ✅ Found ${relevantLines.length} Playwright-related log entries:\n`);
    
    let hasInitialization = false;
    let hasUsage = false;
    let hasErrors = false;

    for (const line of relevantLines.slice(0, 10)) {
      console.log(`  ${line.substring(0, 150)}...`);
      
      if (line.includes('Initialized Playwright')) {
        hasInitialization = true;
      }
      if (line.includes('Using Playwright')) {
        hasUsage = true;
      }
      if (line.includes('error') || line.includes('Error') || line.includes('failed')) {
        hasErrors = true;
      }
    }

    console.log('');
    
    if (hasInitialization) {
      console.log('  ✅ Playwright initialization found in logs');
    }
    if (hasUsage) {
      console.log('  ✅ Playwright usage found in logs');
    }
    if (hasErrors) {
      console.log('  ⚠️  Some errors found in logs');
    }

    return hasInitialization && hasUsage && !hasErrors;
  } catch (error: any) {
    console.error(`  ❌ Error checking logs: ${error.message}`);
    return false;
  }
}

async function findRecentRunWithGoogleNews(): Promise<string | null> {
  console.log('🔍 Finding a recent run with Google News URLs...\n');
  
  try {
    // Get runs from the last 2 hours
    const { stdout } = await execAsync(
      `aws dynamodb scan --table-name ${RUNS_TABLE} --filter-expression "startedAt > :time" --expression-attribute-values '{":time":{"N":"'$((($(date +%s) - 7200) * 1000))'"}}' --max-items 10`
    );
    
    // For now, let's just ask the user for a run ID or use a test
    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🧪 End-to-End Playwright Pipeline Test\n');
  console.log('='.repeat(80));
  console.log('');

  // Get run ID from command line or use a test
  const runId = process.argv[2];
  
  if (!runId) {
    console.log('Usage: npx tsx scripts/test-playwright-e2e.ts <runId>');
    console.log('\nExample:');
    console.log('  npx tsx scripts/test-playwright-e2e.ts 195e12fe-0f60-463f-9028-4e06e2186cad');
    console.log('\nOr provide a run ID to test:');
    process.exit(1);
  }

  console.log(`Testing Run ID: ${runId}\n`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // Step 1: Wait for run to complete (or check if already completed)
    const run = await waitForRun(runId, 300000); // 5 minute timeout
    
    if (run.status === 'failed') {
      console.log('❌ Run failed - cannot test Playwright');
      process.exit(1);
    }

    // Step 2: Check Lambda logs
    console.log('='.repeat(80));
    const logsOk = await checkLambdaLogs(runId);
    
    // Step 3: Check scrape output
    console.log('='.repeat(80));
    const scrapeOk = await checkScrapeOutput(runId);

    // Final verdict
    console.log('='.repeat(80));
    console.log('\n📊 Test Results:\n');
    console.log(`  Lambda Logs: ${logsOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Scrape Output: ${scrapeOk ? '✅ PASS' : '❌ FAIL'}`);
    
    if (logsOk && scrapeOk) {
      console.log('\n✅ End-to-End Test PASSED - Playwright is working correctly!');
      process.exit(0);
    } else {
      console.log('\n❌ End-to-End Test FAILED - Playwright may not be working correctly');
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);

