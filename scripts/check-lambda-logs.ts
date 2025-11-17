/**
 * Fetch and display Lambda CloudWatch logs
 */

import { 
  CloudWatchLogsClient, 
  FilterLogEventsCommand,
  DescribeLogStreamsCommand 
} from '@aws-sdk/client-cloudwatch-logs';

const client = new CloudWatchLogsClient({ region: 'us-east-1' });
const logGroupName = '/aws/lambda/podcast-create';

async function fetchLatestLogs(minutes: number = 5) {
  console.log(`\n📊 Fetching Lambda logs from last ${minutes} minutes...\n`);
  console.log('='.repeat(80));
  
  try {
    // Get the latest log streams
    const streamsResponse = await client.send(new DescribeLogStreamsCommand({
      logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 5,
    }));

    if (!streamsResponse.logStreams || streamsResponse.logStreams.length === 0) {
      console.log('❌ No log streams found');
      return;
    }

    // Fetch logs from last N minutes
    const startTime = Date.now() - (minutes * 60 * 1000);
    
    const logsResponse = await client.send(new FilterLogEventsCommand({
      logGroupName,
      startTime,
      limit: 100,
    }));

    if (!logsResponse.events || logsResponse.events.length === 0) {
      console.log('❌ No recent log events found');
      console.log(`Try running: npx tsx scripts/test-create-podcast-authenticated.ts`);
      return;
    }

    console.log(`✅ Found ${logsResponse.events.length} log events\n`);

    // Group events by request
    let currentRequest: string[] = [];
    let inRequest = false;

    for (const event of logsResponse.events) {
      const message = event.message || '';
      
      // Start of a new request
      if (message.includes('CREATE PODCAST HANDLER - START')) {
        if (currentRequest.length > 0) {
          printRequest(currentRequest);
          currentRequest = [];
        }
        inRequest = true;
      }

      if (inRequest) {
        currentRequest.push(message);
      }

      // End of request
      if (message.includes('END RequestId')) {
        printRequest(currentRequest);
        currentRequest = [];
        inRequest = false;
      }
    }

    // Print any remaining logs
    if (currentRequest.length > 0) {
      printRequest(currentRequest);
    }

  } catch (error: any) {
    console.error('❌ Error fetching logs:', error.message);
    if (error.name === 'ResourceNotFoundException') {
      console.log('\n💡 The Lambda function might not have been invoked yet.');
      console.log('Try running: npx tsx scripts/test-create-podcast-authenticated.ts');
    }
  }
}

function printRequest(logs: string[]) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 REQUEST EXECUTION');
  console.log('='.repeat(80));
  
  // Find key information
  const authInfo = logs.find(l => l.includes('Extracted auth:'));
  const authorizerInfo = logs.find(l => l.includes('Authorizer object:'));
  const headersInfo = logs.find(l => l.includes('Headers:'));
  const requestContextInfo = logs.find(l => l.includes('RequestContext:'));
  
  // Print relevant sections
  if (headersInfo) {
    console.log('\n📨 HEADERS:');
    console.log(headersInfo.replace(/^.*Headers:/, '').trim());
  }
  
  if (requestContextInfo) {
    console.log('\n🔗 REQUEST CONTEXT:');
    console.log(requestContextInfo.replace(/^.*RequestContext:/, '').trim());
  }
  
  if (authorizerInfo) {
    console.log('\n🔐 AUTHORIZER:');
    console.log(authorizerInfo.replace(/^.*Authorizer object:/, '').trim());
  }
  
  if (authInfo) {
    console.log('\n✅ EXTRACTED AUTH:');
    console.log(authInfo.replace(/^.*Extracted auth:/, '').trim());
  }
  
  // Check for errors
  const errorLogs = logs.filter(l => 
    l.includes('ERROR') || 
    l.includes('Unauthorized') ||
    l.includes('Failed')
  );
  
  if (errorLogs.length > 0) {
    console.log('\n❌ ERRORS:');
    errorLogs.forEach(log => console.log(log.trim()));
  }
  
  // Check for success
  const successLogs = logs.filter(l => 
    l.includes('Podcast created successfully') ||
    l.includes('CREATE_COMPLETE')
  );
  
  if (successLogs.length > 0) {
    console.log('\n✅ SUCCESS:');
    successLogs.forEach(log => console.log(log.trim()));
  }
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  const minutes = process.argv[2] ? parseInt(process.argv[2]) : 5;
  await fetchLatestLogs(minutes);
}

main();


