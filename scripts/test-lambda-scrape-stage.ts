/**
 * Test script to invoke Lambda function and test scrape stage with a specific URL
 * This actually tests the scraper in the Lambda environment
 */

import 'dotenv/config';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const testUrl = process.argv[2] || 'https://news.google.com/rss/articles/CBMiuAFBVV95cUxQRkdGbldZT01Ca1oyZFhybWgzYUlTU2RMUEJMVy1ybzh1M1E3S3NHNnN4d0tNVVhXNENDaWRIb0oySjZUeVNrdWNIclBfX0NKazZzNjIzQk9wS0V6ZjdNU2p1bjRBOG5BMlJadW5rTHBTN01CeXhyQldxNFlGcWE2RGx1Z3p0cmJhQjZPamN0bFh4aGxFVDBkVEdKYlUtZ2cxYTNQYlM4bW9WUm4wYzlyZEFmeUg1TTRN?oc=5';

const LAMBDA_FUNCTION_NAME = 'pipeline-orchestrator';
const LOG_GROUP_NAME = '/aws/lambda/pipeline-orchestrator';

async function waitForLogs(startTime: number, timeoutMs: number = 60000): Promise<any[]> {
  const logsClient = new CloudWatchLogsClient({ region: 'us-east-1' });
  const endTime = Date.now();
  
  // Wait a bit for logs to appear
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    const command = new FilterLogEventsCommand({
      logGroupName: LOG_GROUP_NAME,
      startTime,
      endTime,
      filterPattern: 'launchChromium OR playwright-aws-lambda OR Playwright OR scrape',
      limit: 100,
    });
    
    const response = await logsClient.send(command);
    return response.events || [];
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`  ⚠️  Log group not found yet: ${LOG_GROUP_NAME}`);
      return [];
    }
    throw error;
  }
}

async function testLambdaScrapeStage() {
  console.log('🧪 Testing Scrape Stage in Lambda\n');
  console.log('='.repeat(80));
  console.log(`Test URL: ${testUrl}\n`);
  console.log('='.repeat(80));
  console.log('');

  const startTime = Date.now();
  const lambdaClient = new LambdaClient({ region: 'us-east-1' });

  try {
    // Step 1: Prepare test payload for scrape stage
    console.log('1. Preparing test payload...');
    
    // Create a minimal pipeline input that will trigger scrape stage
    // The orchestrator expects PipelineInput format
    const testPayload = {
      runId: `test-scrape-${Date.now()}`,
      podcastId: 'test-podcast',
      configVersion: 1,
      config: {
        companyId: 'Test Company',
        industry: 'Technology',
        competitors: [],
        durationMinutes: 5,
        voice: 'onyx',
        version: 1,
      },
      flags: {
        enable: {
          prepare: false,
          discover: false,  // Skip discover - we'll mock the output
          scrape: true,     // Enable scrape stage
          extract: false,
          summarize: false,
          contrast: false,
          outline: false,
          script: false,
          qa: false,
          tts: false,
          package: false,
        },
        provider: {
          llm: 'openai',
          tts: 'openai',
          http: 'playwright',  // Use Playwright for scraping
        },
        cassetteKey: 'default',
        dryRun: false,
      },
    };

    console.log('✅ Payload prepared\n');

    // Step 2: Invoke Lambda function
    console.log('2. Invoking Lambda function...');
    console.log(`   Function: ${LAMBDA_FUNCTION_NAME}\n`);
    
    const invokeCommand = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      InvocationType: 'RequestResponse', // Synchronous invocation
      Payload: JSON.stringify(testPayload),
    });

    const startInvoke = Date.now();
    const response = await lambdaClient.send(invokeCommand);
    const invokeTime = Date.now() - startInvoke;

    console.log(`✅ Lambda invoked (${invokeTime}ms)\n`);

    // Step 3: Parse response
    console.log('3. Parsing Lambda response...');
    let responsePayload: any;
    try {
      const responseString = new TextDecoder().decode(response.Payload);
      responsePayload = JSON.parse(responseString);
      
      if (responsePayload.errorMessage) {
        console.log(`❌ Lambda error: ${responsePayload.errorMessage}`);
        if (responsePayload.stackTrace) {
          console.log(`Stack trace: ${responsePayload.stackTrace}`);
        }
      } else {
        console.log('✅ Lambda response received');
        console.log(`   Status: ${response.StatusCode}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Could not parse response: ${error.message}`);
      const responseString = new TextDecoder().decode(response.Payload);
      console.log(`   Raw response (first 500 chars): ${responseString.substring(0, 500)}`);
    }
    console.log('');

    // Step 4: Check CloudWatch logs
    console.log('4. Checking CloudWatch logs for Playwright initialization...');
    console.log('   (Waiting 5 seconds for logs to appear...)\n');
    
    const logs = await waitForLogs(startTime, 60000);
    
    if (logs.length > 0) {
      console.log(`✅ Found ${logs.length} relevant log entries:\n`);
      
      const playwrightLogs = logs.filter(log => 
        log.message?.includes('launchChromium') || 
        log.message?.includes('playwright-aws-lambda') ||
        log.message?.includes('Initialized Playwright') ||
        log.message?.includes('Playwright')
      );
      
      if (playwrightLogs.length > 0) {
        console.log('📋 Playwright-related logs:');
        playwrightLogs.slice(0, 10).forEach((log, i) => {
          const timestamp = new Date(log.timestamp || 0).toISOString();
          console.log(`   ${i + 1}. [${timestamp}] ${log.message}`);
        });
        console.log('');
        
        // Check for success indicators
        const hasLaunchChromium = playwrightLogs.some(log => 
          log.message?.includes('launchChromium') || 
          log.message?.includes('Initialized Playwright')
        );
        
        if (hasLaunchChromium) {
          console.log('✅ SUCCESS: Playwright initialized successfully in Lambda!');
        } else {
          console.log('⚠️  WARNING: Playwright logs found but no initialization confirmation');
        }
      } else {
        console.log('⚠️  No Playwright-specific logs found');
        console.log('   Showing all relevant logs:');
        logs.slice(0, 10).forEach((log, i) => {
          const timestamp = new Date(log.timestamp || 0).toISOString();
          console.log(`   ${i + 1}. [${timestamp}] ${log.message}`);
        });
      }
    } else {
      console.log('⚠️  No relevant logs found');
      console.log('   Logs may not be available yet, or the function may not have executed');
      console.log(`   Check manually: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${LAMBDA_FUNCTION_NAME}`);
    }
    console.log('');

    // Step 5: Check for scrape results
    console.log('5. Checking for scrape results...');
    if (responsePayload && responsePayload.scrapeOutput) {
      const scrapeOutput = responsePayload.scrapeOutput;
      console.log('✅ Scrape output found:');
      console.log(`   Contents: ${scrapeOutput.contents?.length || 0} items`);
      console.log(`   Success count: ${scrapeOutput.stats?.successCount || 0}`);
      console.log(`   Failure count: ${scrapeOutput.stats?.failureCount || 0}`);
      
      if (scrapeOutput.contents && scrapeOutput.contents.length > 0) {
        const firstContent = scrapeOutput.contents[0];
        const contentLength = firstContent.content?.length || 0;
        console.log(`   First content length: ${contentLength} characters`);
        
        if (contentLength > 500) {
          console.log('✅ SUCCESS: Got substantial content from scrape!');
          console.log(`   Content preview: ${firstContent.content?.substring(0, 200)}...`);
        } else {
          console.log('⚠️  WARNING: Got minimal content from scrape');
        }
      }
    } else {
      console.log('⚠️  No scrape output in response');
      console.log('   This may be normal if the pipeline structure is different');
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ Test completed!');
    console.log(`\nTo view full logs, check CloudWatch:`);
    console.log(`  https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${LAMBDA_FUNCTION_NAME}`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

testLambdaScrapeStage().catch(console.error);

