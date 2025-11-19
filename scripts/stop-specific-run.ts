/**
 * Script to stop a specific run
 * Usage: tsx scripts/stop-specific-run.ts <runId>
 */

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

async function stopRun(runId: string) {
  const client = getDynamoClient();

  console.log(`🔍 Fetching run ${runId}...`);
  
  // Get the run first
  const getResponse = await client.send(new GetCommand({
    TableName: RUNS_TABLE,
    Key: { id: runId },
  }));

  if (!getResponse.Item) {
    console.error(`❌ Run ${runId} not found in DynamoDB`);
    return false;
  }

  const run = getResponse.Item;
  console.log(`📊 Current status: ${run.status}`);

  if (run.status !== 'running') {
    console.log(`⚠️  Run is not running (status: ${run.status}). Updating anyway...`);
  }

  const updatedRun = {
    ...run,
    status: 'failed',
    completedAt: new Date().toISOString(),
    output: {
      ...run.output,
      error: 'Pipeline stopped by admin (stop-specific-run script)',
    },
  };

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
  
  if (updatedRun.progress) {
    updatedRun.progress.currentStage = '';
  }

  console.log(`🛑 Updating run ${runId} to failed status...`);

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
    console.log(`✅ Run ${runId} updated to failed status`);

    // Create stop flag in S3
    if (isS3Available()) {
      try {
        const stopFlagContent = JSON.stringify({ 
          stopped: true, 
          stoppedAt: new Date().toISOString(),
          stoppedBy: 'stop-specific-run-script',
        });
        await writeToS3(getStopFlagKey(runId), stopFlagContent, 'application/json');
        console.log(`🚩 Stop flag created in S3 for run ${runId}`);
      } catch (s3Error) {
        console.warn(`⚠️  Could not create stop flag in S3:`, s3Error);
      }
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Failed to update run ${runId}:`, error.message);
    return false;
  }
}

async function main() {
  const runId = process.argv[2];

  if (!runId) {
    console.error('❌ Usage: tsx scripts/stop-specific-run.ts <runId>');
    console.error('   Example: tsx scripts/stop-specific-run.ts run_1763559447305_ie5rqh');
    process.exit(1);
  }

  console.log(`🛑 Stopping run: ${runId}\n`);

  try {
    const success = await stopRun(runId);
    if (success) {
      console.log(`\n✅ Successfully stopped run ${runId}`);
    } else {
      console.log(`\n❌ Failed to stop run ${runId}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error stopping run:', error);
    process.exit(1);
  }
}

main();

