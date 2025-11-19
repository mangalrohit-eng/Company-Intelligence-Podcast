/**
 * Persistent storage for runs
 * Uses DynamoDB for production (Vercel), falls back to local file for development
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const RUNS_DB_FILE = join(process.cwd(), 'data', 'runs.json');
const RUNS_TABLE = 'runs';

// Initialize DynamoDB client
const getDynamoClient = () => {
  try {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    return DynamoDBDocumentClient.from(client);
  } catch (error) {
    console.warn('Failed to initialize DynamoDB client:', error);
    return null;
  }
};

export interface PersistedRun {
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

async function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Load all runs from disk (local dev fallback)
 */
async function loadRunsFromDisk(): Promise<Record<string, PersistedRun[]>> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(RUNS_DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

/**
 * Save all runs to disk (local dev fallback)
 */
async function saveRunsToDisk(runs: Record<string, PersistedRun[]>): Promise<void> {
  try {
    await ensureDataDir();
    await fs.writeFile(RUNS_DB_FILE, JSON.stringify(runs, null, 2));
  } catch (error) {
    console.error('Failed to save runs to disk:', error);
  }
}

/**
 * Save a single run to DynamoDB (or disk fallback)
 */
export async function saveRun(run: PersistedRun): Promise<void> {
  const docClient = getDynamoClient();
  
  if (docClient && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    // Use DynamoDB (production/Vercel)
    try {
      const now = new Date().toISOString();
      // Map our status ('completed') to DynamoDB status ('success')
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
            finishedAt: run.completedAt, // DynamoDB uses 'finishedAt', we use 'completedAt'
            completedAt: run.completedAt, // Keep both for compatibility
            duration: run.duration,
            errorMessage: run.error, // DynamoDB uses 'errorMessage', we use 'error'
            error: run.error, // Keep both for compatibility
            progress: run.progress,
            output: run.output,
            updatedAt: now,
          },
        })
      );
      console.log(`✅ Saved run ${run.id} to DynamoDB`);
    } catch (error: any) {
      console.error(`❌ Failed to save run to DynamoDB:`, error);
      // Fallback to disk
      await saveRunToDisk(run);
    }
  } else {
    // Fallback to disk (local dev)
    await saveRunToDisk(run);
  }
}

/**
 * Save run to disk (fallback)
 */
async function saveRunToDisk(run: PersistedRun): Promise<void> {
  const allRuns = await loadRunsFromDisk();
  
  if (!allRuns[run.podcastId]) {
    allRuns[run.podcastId] = [];
  }
  
  const existingIndex = allRuns[run.podcastId].findIndex(r => r.id === run.id);
  if (existingIndex >= 0) {
    allRuns[run.podcastId][existingIndex] = run;
  } else {
    allRuns[run.podcastId].push(run);
  }
  
  await saveRunsToDisk(allRuns);
}

/**
 * Get runs for a specific podcast from DynamoDB (or disk fallback)
 */
export async function getRunsForPodcast(podcastId: string): Promise<PersistedRun[]> {
  const docClient = getDynamoClient();
  
  if (docClient && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    // Use DynamoDB (production/Vercel)
    try {
      let allRuns: any[] = [];
      let lastEvaluatedKey: any = undefined;
      
      // Handle pagination for DynamoDB Query
      do {
        const response = await docClient.send(
          new QueryCommand({
            TableName: RUNS_TABLE,
            IndexName: 'PodcastIdIndex',
            KeyConditionExpression: 'podcastId = :podcastId',
            ExpressionAttributeValues: {
              ':podcastId': podcastId,
            },
            ScanIndexForward: false, // Sort descending (newest first)
            ExclusiveStartKey: lastEvaluatedKey,
          })
        );
        
        if (response.Items) {
          allRuns = allRuns.concat(response.Items);
        }
        
        lastEvaluatedKey = response.LastEvaluatedKey;
      } while (lastEvaluatedKey);
      
      const runs = allRuns.map((item: any) => ({
        id: item.id,
        podcastId: item.podcastId,
        // Map DynamoDB status ('success') to our status ('completed')
        status: item.status === 'success' ? 'completed' : item.status,
        createdAt: item.createdAt,
        startedAt: item.startedAt,
        completedAt: item.completedAt || item.finishedAt,
        duration: item.duration,
        error: item.error || item.errorMessage,
        progress: item.progress,
        output: item.output,
      }));
      
      console.log(`✅ Fetched ${runs.length} runs from DynamoDB for podcast ${podcastId}`);
      return runs;
    } catch (error: any) {
      console.error(`❌ Failed to fetch runs from DynamoDB:`, {
        error: error.message,
        code: error.code,
        name: error.name,
        table: RUNS_TABLE,
        index: 'PodcastIdIndex',
      });
      // Fallback to disk
      const diskRuns = await loadRunsFromDisk();
      return diskRuns[podcastId] || [];
    }
  } else {
    // Fallback to disk (local dev)
    const diskRuns = await loadRunsFromDisk();
    return diskRuns[podcastId] || [];
  }
}

/**
 * Delete old failed runs (keep only last 50 per podcast)
 * Note: This is a simplified version - in production, you'd want to use DynamoDB TTL or batch delete
 */
export async function cleanupOldRuns(): Promise<void> {
  // For now, this is a no-op in production (DynamoDB)
  // In local dev, clean up disk storage
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    const allRuns = await loadRunsFromDisk();
    
    for (const podcastId in allRuns) {
      const runs = allRuns[podcastId];
      
      const completedRuns = runs.filter(r => r.status === 'completed');
      const failedRuns = runs.filter(r => r.status === 'failed' || r.status === 'running')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50);
      
      allRuns[podcastId] = [...completedRuns, ...failedRuns];
    }
    
    await saveRunsToDisk(allRuns);
  }
}

