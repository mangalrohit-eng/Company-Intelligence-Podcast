/**
 * Script to list all running runs
 * Usage: tsx scripts/list-running-runs.ts
 */

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const RUNS_TABLE = process.env.RUNS_TABLE || 'runs';

function getDynamoClient() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  return DynamoDBDocumentClient.from(client);
}

async function getAllRuns() {
  const client = getDynamoClient();
  const allRuns: any[] = [];
  let lastEvaluatedKey: any = undefined;

  do {
    const command = new ScanCommand({
      TableName: RUNS_TABLE,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await client.send(command);
    if (response.Items) {
      allRuns.push(...response.Items);
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allRuns;
}

async function main() {
  console.log('🔍 Fetching all runs from DynamoDB...\n');
  
  try {
    const runs = await getAllRuns();
    
    console.log(`📊 Total runs: ${runs.length}\n`);

    const runningRuns = runs.filter(r => r.status === 'running');
    const failedRuns = runs.filter(r => r.status === 'failed');
    const completedRuns = runs.filter(r => r.status === 'completed');

    console.log(`Status breakdown:`);
    console.log(`  - Running: ${runningRuns.length}`);
    console.log(`  - Failed: ${failedRuns.length}`);
    console.log(`  - Completed: ${completedRuns.length}`);
    console.log(`  - Other: ${runs.length - runningRuns.length - failedRuns.length - completedRuns.length}\n`);

    if (runningRuns.length > 0) {
      console.log('🏃 Running runs:');
      runningRuns.forEach(run => {
        console.log(`  - ${run.id} (podcast: ${run.podcastId}, stage: ${run.progress?.currentStage || 'unknown'}, created: ${run.createdAt})`);
      });
      console.log('');
    }

    // Check for runs matching the partial ID
    const matchingRuns = runs.filter(r => r.id.includes('1763559447305'));
    if (matchingRuns.length > 0) {
      console.log('🔍 Runs matching "1763559447305":');
      matchingRuns.forEach(run => {
        console.log(`  - ${run.id} (status: ${run.status}, podcast: ${run.podcastId})`);
      });
    }
  } catch (error: any) {
    console.error('❌ Error fetching runs:', error);
    process.exit(1);
  }
}

main();

