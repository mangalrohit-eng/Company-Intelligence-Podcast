/**
 * Monitor Lambda logs for S3 write issues
 */

import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const logGroupName = '/aws/lambda/pipeline-orchestrator';
const client = new CloudWatchLogsClient({ region: 'us-east-1' });

async function monitorLogs(runId?: string) {
  const startTime = Date.now() - (10 * 60 * 1000); // Last 10 minutes
  
  console.log(`\n🔍 Monitoring Lambda logs for S3 write issues...`);
  if (runId) {
    console.log(`   Filtering for run: ${runId}\n`);
  } else {
    console.log(`   Showing all recent activity\n`);
  }
  console.log('='.repeat(80));

  try {
    const filterPattern = runId ? runId : undefined;
    
    const response = await client.send(new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern,
      limit: 100,
    }));

    if (!response.events || response.events.length === 0) {
      console.log('❌ No recent log events found');
      return;
    }

    console.log(`✅ Found ${response.events.length} log events\n`);

    // Group by run ID
    const runs: Record<string, any[]> = {};
    
    for (const event of response.events) {
      const message = event.message || '';
      const runIdMatch = message.match(/"runId"\s*:\s*"([^"]+)"/);
      const runIdFromLog = runIdMatch ? runIdMatch[1] : 'unknown';
      
      if (!runs[runIdFromLog]) {
        runs[runIdFromLog] = [];
      }
      runs[runIdFromLog].push({
        timestamp: event.timestamp,
        message,
      });
    }

    // Analyze each run
    for (const [runId, events] of Object.entries(runs)) {
      console.log(`\n📊 Run: ${runId}`);
      console.log('-'.repeat(80));
      
      // Check for S3 write issues
      const s3Writes = events.filter(e => 
        e.message.includes('Writing debug file to S3') ||
        e.message.includes('File written to S3') ||
        e.message.includes('Failed to write') ||
        e.message.includes('S3 write timeout') ||
        e.message.includes('Successfully wrote')
      );
      
      const s3Errors = events.filter(e => 
        e.message.includes('Failed to write') ||
        e.message.includes('S3 write timeout') ||
        e.message.includes('Failed to save audio')
      );
      
      const s3Success = events.filter(e => 
        e.message.includes('Successfully wrote') ||
        e.message.includes('File written to S3') ||
        e.message.includes('Audio saved to S3')
      );
      
      console.log(`   S3 Write Attempts: ${s3Writes.length}`);
      console.log(`   S3 Write Success: ${s3Success.length}`);
      console.log(`   S3 Write Errors: ${s3Errors.length}`);
      
      if (s3Errors.length > 0) {
        console.log(`\n   ❌ ERRORS FOUND:`);
        s3Errors.forEach(e => {
          const time = new Date(e.timestamp!).toISOString();
          console.log(`   [${time}] ${e.message.substring(0, 200)}`);
        });
      }
      
      // Check for credential/region issues
      const credIssues = events.filter(e => 
        e.message.includes('credential') ||
        e.message.includes('region') ||
        e.message.includes('REGION') ||
        e.message.includes('AWS_REGION')
      );
      
      if (credIssues.length > 0) {
        console.log(`\n   🔑 Credential/Region Info:`);
        credIssues.slice(0, 5).forEach(e => {
          const time = new Date(e.timestamp!).toISOString();
          console.log(`   [${time}] ${e.message.substring(0, 200)}`);
        });
      }
      
      // Check for timeout issues
      const timeouts = events.filter(e => 
        e.message.includes('timeout') ||
        e.message.includes('Task timed out')
      );
      
      if (timeouts.length > 0) {
        console.log(`\n   ⏱️  TIMEOUTS:`);
        timeouts.forEach(e => {
          const time = new Date(e.timestamp!).toISOString();
          console.log(`   [${time}] ${e.message.substring(0, 200)}`);
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error fetching logs:', error.message);
    if (error.name === 'ResourceNotFoundException') {
      console.log('\n💡 The Lambda function might not have been invoked yet.');
    }
  }
}

const runId = process.argv[2];
monitorLogs(runId);

