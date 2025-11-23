/**
 * Script to check run error details
 * Usage: tsx scripts/check-run-error.ts <runId> [podcastId]
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { readFile } from 'fs/promises';
import { join } from 'path';

const runId = process.argv[2];
const podcastId = process.argv[3];

if (!runId) {
  console.error('Usage: tsx scripts/check-run-error.ts <runId> [podcastId]');
  process.exit(1);
}

async function checkLocalRuns() {
  try {
    const runsFile = join(process.cwd(), 'data', 'runs.json');
    const data = await readFile(runsFile, 'utf-8');
    const runs = JSON.parse(data);
    
    for (const [podId, runList] of Object.entries(runs)) {
      const found = (runList as any[]).find((r: any) => r.id === runId);
      if (found) {
        console.log('\n✅ Found in local runs.json:');
        console.log('Podcast ID:', podId);
        console.log('Status:', found.status);
        console.log('Error:', found.error || 'No error field');
        console.log('Output:', JSON.stringify(found.output, null, 2));
        console.log('Progress:', JSON.stringify(found.progress, null, 2));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.log('Local runs.json not found or invalid');
    return false;
  }
}

async function checkDynamoDB() {
  try {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(client);
    
    // Try to query by run ID directly (primary key)
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: 'runs',
        KeyConditionExpression: 'id = :runId',
        ExpressionAttributeValues: {
          ':runId': runId,
        },
      }));
      
      if (result.Items && result.Items.length > 0) {
        const run = result.Items[0];
        console.log('\n✅ Found in DynamoDB:');
        console.log('Podcast ID:', run.podcastId);
        console.log('Status:', run.status);
        console.log('Error:', run.error || 'No error field');
        console.log('Output:', JSON.stringify(run.output, null, 2));
        console.log('Progress:', JSON.stringify(run.progress, null, 2));
        return true;
      }
    } catch (err: any) {
      if (err.name === 'ResourceNotFoundException') {
        console.log('DynamoDB table not found (might be local dev)');
        return false;
      }
      throw err;
    }
    
    // If podcastId provided, try querying by podcastId index
    if (podcastId) {
      const result = await docClient.send(new QueryCommand({
        TableName: 'runs',
        IndexName: 'PodcastIdIndex',
        KeyConditionExpression: 'podcastId = :podcastId',
        ExpressionAttributeValues: {
          ':podcastId': podcastId,
        },
      }));
      
      const found = result.Items?.find((r: any) => r.id === runId);
      if (found) {
        console.log('\n✅ Found in DynamoDB (via PodcastIdIndex):');
        console.log('Podcast ID:', found.podcastId);
        console.log('Status:', found.status);
        console.log('Error:', found.error || 'No error field');
        console.log('Output:', JSON.stringify(found.output, null, 2));
        console.log('Progress:', JSON.stringify(found.progress, null, 2));
        return true;
      }
    }
    
    return false;
  } catch (error: any) {
    console.log('DynamoDB check failed:', error.message);
    console.log('Make sure AWS credentials are configured');
    return false;
  }
}

async function checkErrorFiles() {
  try {
    const debugDir = join(process.cwd(), 'output', 'episodes', runId, 'debug');
    const { readdir, readFile } = await import('fs/promises');
    
    try {
      const files = await readdir(debugDir);
      const errorFiles = files.filter(f => f.includes('_error.json'));
      
      if (errorFiles.length > 0) {
        console.log('\n✅ Found error files:');
        for (const file of errorFiles) {
          const content = await readFile(join(debugDir, file), 'utf-8');
          const error = JSON.parse(content);
          console.log(`\n${file}:`);
          console.log(JSON.stringify(error, null, 2));
        }
        return true;
      }
    } catch {
      // Directory doesn't exist
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log(`\n🔍 Checking for run: ${runId}\n`);
  
  // Check local runs.json
  const foundLocal = await checkLocalRuns();
  
  // Check DynamoDB
  const foundDynamo = await checkDynamoDB();
  
  // Check error files
  const foundErrors = await checkErrorFiles();
  
  if (!foundLocal && !foundDynamo && !foundErrors) {
    console.log('\n❌ Run not found in any location.');
    console.log('\nPossible reasons:');
    console.log('1. Run was created in production (DynamoDB) - configure AWS credentials to check');
    console.log('2. Run failed before it could be persisted');
    console.log('3. Run was cleaned up (old failed runs are limited to 50 per podcast)');
    console.log('4. Run ID is incorrect');
    console.log('\nTo check production DynamoDB:');
    console.log('1. Set AWS credentials: aws configure');
    console.log('2. Set AWS_REGION in .env');
    console.log('3. Run this script again');
  }
}

main().catch(console.error);

