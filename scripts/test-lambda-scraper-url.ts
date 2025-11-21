/**
 * Test script to invoke Lambda function and test scraper with a specific URL
 * This actually invokes the Lambda function in AWS to test the Playwright fix
 */

import 'dotenv/config';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const testUrl = process.argv[2] || 'https://news.google.com/rss/articles/CBMiuAFBVV95cUxQRkdGbldZT01Ca1oyZFhybWgzYUlTU2RMUEJMVy1ybzh1M1E3S3NHNnN4d0tNVVhXNENDaWRIb0oySjZUeVNrdWNIclBfX0NKazZzNjIzQk9wS0V6ZjdNU2p1bjRBOG5BMlJadW5rTHBTN01CeXhyQldxNFlGcWE2RGx1Z3p0cmJhQjZPamN0bFh4aGxFVDBkVEdKYlUtZ2cxYTNQYlM4bW9WUm4wYzlyZEFmeUg1TTRN?oc=5';

const STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:098478926952:stateMachine:podcast-pipeline';
const RUNS_TABLE = 'runs';

async function waitForExecution(executionArn: string, timeoutMs: number = 300000): Promise<string> {
  const sfnClient = new SFNClient({ region: 'us-east-1' });
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const { describeExecution } = await import('@aws-sdk/client-sfn');
    const { DescribeExecutionCommand } = describeExecution;
    
    const command = new DescribeExecutionCommand({ executionArn });
    const response = await sfnClient.send(command);
    
    if (response.status === 'SUCCEEDED') {
      return 'SUCCEEDED';
    } else if (response.status === 'FAILED' || response.status === 'TIMED_OUT' || response.status === 'ABORTED') {
      return response.status || 'FAILED';
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return 'TIMED_OUT';
}

async function getRunEvents(runId: string) {
  const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
  const { marshall } = await import('@aws-sdk/util-dynamodb');
  
  // Get run from DynamoDB
  const getCommand = new GetItemCommand({
    TableName: RUNS_TABLE,
    Key: marshall({ id: runId }),
  });
  
  const run = await dynamoClient.send(getCommand);
  return run.Item ? { id: runId, ...run.Item } : null;
}

async function checkCloudWatchLogs(functionName: string, startTime: number) {
  const logsClient = new CloudWatchLogsClient({ region: 'us-east-1' });
  const logGroupName = `/aws/lambda/${functionName}`;
  
  try {
    const command = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: 'launchChromium OR playwright-aws-lambda OR Playwright',
      limit: 50,
    });
    
    const response = await logsClient.send(command);
    return response.events || [];
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`  ⚠️  Log group not found yet: ${logGroupName}`);
      return [];
    }
    throw error;
  }
}

async function testLambdaScraper() {
  console.log('🧪 Testing Playwright Scraper in Lambda\n');
  console.log('='.repeat(80));
  console.log(`Test URL: ${testUrl}\n`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // Step 1: Create a test run via Step Functions
    console.log('1. Creating test run via Step Functions...');
    const sfnClient = new SFNClient({ region: 'us-east-1' });
    
    const runId = `test-${Date.now()}`;
    const input = {
      runId,
      podcastId: 'test-podcast',
      config: {
        companyId: 'Test Company',
        industry: 'Technology',
        competitors: [],
        durationMinutes: 5,
        voice: 'onyx',
      },
      flags: {
        enable: {
          discover: false,
          scrape: true,  // Only enable scrape stage
          extract: false,
          tts: false,
        },
        providers: {
          llmProvider: 'openai',
          ttsProvider: 'openai',
          httpProvider: 'playwright',  // Use Playwright
        },
      },
      // Add test URL to scrape
      testUrls: [testUrl],
    };

    const startCommand = new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      input: JSON.stringify(input),
      name: runId,
    });

    const execution = await sfnClient.send(startCommand);
    const executionArn = execution.executionArn;
    
    console.log(`✅ Test run created: ${runId}`);
    console.log(`   Execution ARN: ${executionArn}\n`);

    // Step 2: Wait for execution to complete
    console.log('2. Waiting for execution to complete...');
    console.log('   (This may take 1-5 minutes)\n');
    
    const status = await waitForExecution(executionArn!, 300000); // 5 minute timeout
    console.log(`✅ Execution status: ${status}\n`);

    // Step 3: Check CloudWatch logs
    console.log('3. Checking CloudWatch logs for Playwright initialization...');
    const startTime = Date.now() - 600000; // Last 10 minutes
    const logs = await checkCloudWatchLogs('pipeline-orchestrator', startTime);
    
    if (logs.length > 0) {
      console.log(`✅ Found ${logs.length} relevant log entries:\n`);
      logs.slice(0, 10).forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.message}`);
      });
      
      // Check for success indicators
      const hasLaunchChromium = logs.some(log => 
        log.message?.includes('launchChromium') || 
        log.message?.includes('Initialized Playwright')
      );
      
      if (hasLaunchChromium) {
        console.log('\n✅ SUCCESS: Playwright initialized successfully in Lambda!');
      } else {
        console.log('\n⚠️  WARNING: No Playwright initialization found in logs');
      }
    } else {
      console.log('⚠️  No relevant logs found (logs may not be available yet)');
    }
    console.log('');

    // Step 4: Get run details
    console.log('4. Checking run details...');
    const run = await getRunEvents(runId);
    if (run) {
      console.log(`✅ Run found: ${runId}`);
      console.log(`   Status: ${(run as any).status || 'unknown'}`);
    } else {
      console.log('⚠️  Run not found in DynamoDB yet');
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ Test completed!');
    console.log(`\nTo view full logs, check CloudWatch:`);
    console.log(`  https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fpipeline-orchestrator`);
    console.log(`\nTo view execution details:`);
    console.log(`  https://console.aws.amazon.com/states/home?region=us-east-1#/executions/details/${executionArn}`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

testLambdaScraper().catch(console.error);

