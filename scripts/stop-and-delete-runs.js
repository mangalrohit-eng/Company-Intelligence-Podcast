/**
 * Stop and Delete All Pending/Running Runs
 * This script stops all pending or running runs and then deletes them from DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const RUNS_TABLE = 'runs';
const REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function getAllRuns() {
  const allRuns = [];
  let lastEvaluatedKey = undefined;
  
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: RUNS_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 100,
      })
    );
    
    if (result.Items) {
      allRuns.push(...result.Items);
    }
    
    lastEvaluatedKey = result.LastEvaluatedKey;
    console.log(`  Scanned ${allRuns.length} runs...`);
  } while (lastEvaluatedKey);
  
  return allRuns;
}

async function stopRun(runId) {
  const now = new Date().toISOString();
  
  await docClient.send(
    new UpdateCommand({
      TableName: RUNS_TABLE,
      Key: { id: runId },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':status': 'stopped',
        ':updatedAt': now,
      },
    })
  );
}

async function deleteRun(runId) {
  await docClient.send(
    new DeleteCommand({
      TableName: RUNS_TABLE,
      Key: { id: runId },
    })
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
  
  console.log('=========================================');
  console.log('Stop and Delete All Pending/Running Runs');
  console.log('=========================================');
  console.log('');
  
  if (dryRun) {
    console.log('[DRY RUN MODE] - No changes will be made');
    console.log('');
  }
  
  console.log(`Scanning DynamoDB table: ${RUNS_TABLE}`);
  console.log(`Region: ${REGION}`);
  console.log('');
  
  // Get all runs
  const allRuns = await getAllRuns();
  console.log(`Found ${allRuns.length} total runs`);
  console.log('');
  
  // Filter for pending or running runs
  const runsToProcess = allRuns.filter(run => 
    run.status === 'pending' || run.status === 'running'
  );
  
  console.log(`Found ${runsToProcess.length} pending or running runs`);
  console.log('');
  
  if (runsToProcess.length === 0) {
    console.log('No pending or running runs found. Nothing to do.');
    return;
  }
  
  // Display runs to be processed
  console.log('Runs to process:');
  runsToProcess.forEach(run => {
    console.log(`  - ${run.id} (Status: ${run.status}, Podcast: ${run.podcastId}, Created: ${run.createdAt})`);
  });
  console.log('');
  
  if (dryRun) {
    console.log(`[DRY RUN] Would stop and delete ${runsToProcess.length} runs`);
    return;
  }
  
  // Process runs
  console.log('Stopping and deleting runs...');
  console.log('');
  
  let stoppedCount = 0;
  let deletedCount = 0;
  let errorCount = 0;
  
  for (const run of runsToProcess) {
    try {
      console.log(`  Processing run: ${run.id}...`);
      
      // Stop the run
      await stopRun(run.id);
      stoppedCount++;
      console.log(`    [SUCCESS] Run ${run.id} stopped`);
      
      // Delete the run
      await deleteRun(run.id);
      deletedCount++;
      console.log(`    [SUCCESS] Run ${run.id} deleted`);
      
    } catch (error) {
      errorCount++;
      console.error(`    [ERROR] Failed to process run ${run.id}:`, error.message);
    }
  }
  
  console.log('');
  console.log('=========================================');
  console.log('Summary:');
  console.log(`  Stopped: ${stoppedCount}`);
  console.log(`  Deleted: ${deletedCount}`);
  console.log(`  Errors:  ${errorCount}`);
  console.log('=========================================');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

