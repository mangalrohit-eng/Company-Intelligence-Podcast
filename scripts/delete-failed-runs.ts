/**
 * Script to delete all failed runs from DynamoDB
 * Usage: tsx scripts/delete-failed-runs.ts
 */

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

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

async function getAllFailedRuns() {
  const client = getDynamoClient();
  
  const failedRuns: any[] = [];
  let lastEvaluatedKey: any = undefined;

  do {
    const command = new ScanCommand({
      TableName: RUNS_TABLE,
      FilterExpression: '#status = :failed',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':failed': 'failed',
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await client.send(command);
    
    if (response.Items) {
      failedRuns.push(...response.Items);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return failedRuns;
}

async function deleteRun(run: any) {
  const client = getDynamoClient();
  const runId = run.id;
  const podcastId = run.podcastId;

  console.log(`🗑️  Deleting failed run ${runId} (podcast ${podcastId})`);

  try {
    await client.send(new DeleteCommand({
      TableName: RUNS_TABLE,
      Key: { id: runId },
    }));
    console.log(`✅ Deleted run ${runId}`);
  } catch (error: any) {
    console.error(`❌ Failed to delete run ${runId}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🔍 Finding all failed runs...');
  
  try {
    const failedRuns = await getAllFailedRuns();
    
    if (failedRuns.length === 0) {
      console.log('✅ No failed runs found.');
      return;
    }

    console.log(`📊 Found ${failedRuns.length} failed run(s):`);
    failedRuns.forEach(run => {
      console.log(`  - ${run.id} (podcast: ${run.podcastId}, created: ${run.createdAt})`);
    });

    console.log(`\n🗑️  Deleting ${failedRuns.length} failed run(s)...`);
    
    let successCount = 0;
    let failureCount = 0;

    for (const run of failedRuns) {
      try {
        await deleteRun(run);
        successCount++;
      } catch (error: any) {
        console.error(`Failed to delete run ${run.id}:`, error.message);
        failureCount++;
      }
    }

    console.log(`\n✅ Summary:`);
    console.log(`  - Successfully deleted: ${successCount}`);
    console.log(`  - Failed to delete: ${failureCount}`);
    console.log(`  - Total: ${failedRuns.length}`);
  } catch (error: any) {
    console.error('❌ Error deleting failed runs:', error);
    process.exit(1);
  }
}

main();

