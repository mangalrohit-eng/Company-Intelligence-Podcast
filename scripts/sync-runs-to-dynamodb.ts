/**
 * Utility script to sync local runs from data/runs.json to DynamoDB
 * 
 * Usage: npx tsx scripts/sync-runs-to-dynamodb.ts
 */

import 'dotenv/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const RUNS_DB_FILE = join(process.cwd(), 'data', 'runs.json');
const RUNS_TABLE = 'runs';

interface PersistedRun {
  id: string;
  podcastId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  progress: any;
  output?: any;
}

async function syncRunsToDynamoDB() {
  // Check for AWS credentials
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not found in environment variables');
    console.error('   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file');
    process.exit(1);
  }

  // Initialize DynamoDB client
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  const docClient = DynamoDBDocumentClient.from(client);

  // Load runs from local file
  let localRuns: Record<string, PersistedRun[]> = {};
  try {
    const data = await readFile(RUNS_DB_FILE, 'utf-8');
    localRuns = JSON.parse(data);
    console.log(`📂 Loaded runs from ${RUNS_DB_FILE}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  No local runs file found. Nothing to sync.');
      process.exit(0);
    }
    throw error;
  }

  // Count total runs
  const totalRuns = Object.values(localRuns).reduce((sum, runs) => sum + runs.length, 0);
  console.log(`📊 Found ${totalRuns} runs across ${Object.keys(localRuns).length} podcasts`);

  // Sync each run to DynamoDB
  let synced = 0;
  let errors = 0;

  for (const [podcastId, runs] of Object.entries(localRuns)) {
    for (const run of runs) {
      try {
        const now = new Date().toISOString();
        const dynamoStatus = run.status === 'completed' ? 'success' : run.status;
        
        await docClient.send(
          new PutCommand({
            TableName: RUNS_TABLE,
            Item: {
              id: run.id,
              podcastId: run.podcastId,
              status: dynamoStatus,
              createdAt: run.createdAt,
              startedAt: run.startedAt || now,
              finishedAt: run.completedAt,
              completedAt: run.completedAt,
              duration: run.duration,
              errorMessage: run.error,
              error: run.error,
              progress: run.progress,
              output: run.output,
              updatedAt: now,
            },
          })
        );
        
        synced++;
        console.log(`✅ Synced run ${run.id} (${run.status}) for podcast ${podcastId}`);
      } catch (error: any) {
        errors++;
        console.error(`❌ Failed to sync run ${run.id}:`, error.message);
      }
    }
  }

  console.log(`\n📊 Sync complete:`);
  console.log(`   ✅ Synced: ${synced}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total: ${totalRuns}`);
}

syncRunsToDynamoDB().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

