/**
 * Script to stop all active/running runs
 * Usage: tsx scripts/stop-all-runs.ts
 */

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isS3Available, writeToS3, getStopFlagKey } from '../src/lib/s3-storage';

const RUNS_TABLE = process.env.RUNS_TABLE || 'runs';

// Initialize DynamoDB client
const getDynamoClient = () => {
  try {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    return DynamoDBDocumentClient.from(client);
  } catch (error) {
    console.error('Failed to initialize DynamoDB client:', error);
    throw error;
  }
};

async function getAllRunningRuns() {
  const client = getDynamoClient();
  
  const runningRuns: any[] = [];
  let lastEvaluatedKey: any = undefined;

  do {
    const command = new ScanCommand({
      TableName: RUNS_TABLE,
      FilterExpression: '#status = :running',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':running': 'running',
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await client.send(command);
    
    if (response.Items) {
      runningRuns.push(...response.Items);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return runningRuns;
}

async function stopRun(run: any) {
  const client = getDynamoClient();
  const runId = run.id;
  const podcastId = run.podcastId;

  console.log(`🛑 Stopping run ${runId} (podcast ${podcastId})`);

  // Update run status to failed with cancellation message
  const updatedRun = {
    ...run,
    status: 'failed',
    completedAt: new Date().toISOString(),
    output: {
      ...run.output,
      error: 'Pipeline stopped by user (stop-all-runs script)',
    },
  };

  // Mark all running stages as failed
  const stageOrder = ['prepare', 'discover', 'disambiguate', 'rank', 'scrape', 'extract', 'summarize', 'contrast', 'outline', 'script', 'qa', 'tts', 'package'];
  const currentStageIndex = run.progress?.currentStage ? stageOrder.indexOf(run.progress.currentStage) : -1;
  
  if (currentStageIndex >= 0 && updatedRun.progress?.stages) {
    for (let i = currentStageIndex; i < stageOrder.length; i++) {
      const stageId = stageOrder[i];
      if (updatedRun.progress.stages[stageId]) {
        if (updatedRun.progress.stages[stageId].status === 'running' || updatedRun.progress.stages[stageId].status === 'pending') {
          updatedRun.progress.stages[stageId].status = 'failed';
          updatedRun.progress.stages[stageId].completedAt = new Date().toISOString();
        }
      }
    }
  }
  
  // Clear current stage
  if (updatedRun.progress) {
    updatedRun.progress.currentStage = '';
  }

  // Update in DynamoDB
  try {
    await client.send(new UpdateCommand({
      TableName: RUNS_TABLE,
      Key: { id: runId },
      UpdateExpression: 'SET #status = :status, completedAt = :completedAt, #output = :output, progress = :progress',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#output': 'output',
      },
      ExpressionAttributeValues: {
        ':status': 'failed',
        ':completedAt': updatedRun.completedAt,
        ':output': updatedRun.output,
        ':progress': updatedRun.progress,
      },
    }));
    console.log(`✅ Run ${runId} stopped and saved to DynamoDB`);

    // Create stop flag in S3
    if (isS3Available()) {
      try {
        const stopFlagContent = JSON.stringify({ 
          stopped: true, 
          stoppedAt: new Date().toISOString(),
          stoppedBy: 'stop-all-runs-script',
        });
        await writeToS3(getStopFlagKey(runId), stopFlagContent, 'application/json');
        console.log(`🚩 Stop flag created in S3 for run ${runId}`);
      } catch (s3Error) {
        console.warn(`⚠️  Could not create stop flag in S3 for ${runId}:`, s3Error);
      }
    }
  } catch (error: any) {
    console.error(`❌ Failed to stop run ${runId}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🔍 Finding all running runs...');
  
  try {
    const runningRuns = await getAllRunningRuns();
    
    if (runningRuns.length === 0) {
      console.log('✅ No running runs found. All runs are already stopped.');
      return;
    }

    console.log(`📊 Found ${runningRuns.length} running run(s):`);
    runningRuns.forEach(run => {
      console.log(`  - ${run.id} (podcast: ${run.podcastId}, stage: ${run.progress?.currentStage || 'unknown'})`);
    });

    console.log(`\n🛑 Stopping ${runningRuns.length} run(s)...`);
    
    let successCount = 0;
    let failureCount = 0;

    for (const run of runningRuns) {
      try {
        await stopRun(run);
        successCount++;
      } catch (error: any) {
        console.error(`Failed to stop run ${run.id}:`, error.message);
        failureCount++;
      }
    }

    console.log(`\n✅ Summary:`);
    console.log(`  - Successfully stopped: ${successCount}`);
    console.log(`  - Failed to stop: ${failureCount}`);
    console.log(`  - Total: ${runningRuns.length}`);
  } catch (error: any) {
    console.error('❌ Error stopping runs:', error);
    process.exit(1);
  }
}

main();

