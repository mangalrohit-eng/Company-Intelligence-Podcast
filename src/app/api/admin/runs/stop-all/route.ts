/**
 * API Route: Stop All Active Runs
 * POST /api/admin/runs/stop-all - Stop all running pipelines
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isS3Available, writeToS3, getStopFlagKey } from '@/lib/s3-storage';
import { runsStore } from '@/lib/runs-store';

const RUNS_TABLE = process.env.RUNS_TABLE || 'runs';

function getDynamoClient() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  return DynamoDBDocumentClient.from(client);
}

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

  // Also check in-memory store for running runs
  for (const podcastId in runsStore) {
    const memoryRuns = runsStore[podcastId] || [];
    for (const run of memoryRuns) {
      if (run.status === 'running') {
        // Check if already in runningRuns (avoid duplicates)
        if (!runningRuns.find(r => r.id === run.id)) {
          runningRuns.push(run);
        }
      }
    }
  }

  return runningRuns;
}

async function stopRun(run: any) {
  const client = getDynamoClient();
  const runId = run.id;

  const updatedRun = {
    ...run,
    status: 'failed',
    completedAt: new Date().toISOString(),
    output: {
      ...run.output,
      error: 'Pipeline stopped by admin (stop-all)',
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

  // Update in DynamoDB (if it exists there)
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
  } catch (error: any) {
    // If run doesn't exist in DynamoDB, that's okay - it might be in-memory only
    console.log(`Run ${runId} not found in DynamoDB, updating in-memory store only`);
  }

  // Also update in-memory store
  for (const podcastId in runsStore) {
    const memoryRuns = runsStore[podcastId] || [];
    const runIndex = memoryRuns.findIndex(r => r.id === runId);
    if (runIndex >= 0) {
      memoryRuns[runIndex] = updatedRun;
      console.log(`Updated run ${runId} in in-memory store for podcast ${podcastId}`);
    }
  }

  if (isS3Available()) {
    try {
      const stopFlagContent = JSON.stringify({ 
        stopped: true, 
        stoppedAt: new Date().toISOString(),
        stoppedBy: 'admin-stop-all',
      });
      await writeToS3(getStopFlagKey(runId), stopFlagContent, 'application/json');
    } catch (s3Error) {
      // Continue even if S3 write fails
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const runningRuns = await getAllRunningRuns();
    
    if (runningRuns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No running runs found',
        stopped: 0,
      });
    }

    let successCount = 0;
    let failureCount = 0;

    for (const run of runningRuns) {
      try {
        await stopRun(run);
        successCount++;
      } catch (error: any) {
        console.error(`Failed to stop run ${run.id}:`, error);
        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Stopped ${successCount} run(s)`,
      stopped: successCount,
      failed: failureCount,
      total: runningRuns.length,
    });
  } catch (error: any) {
    console.error('Failed to stop all runs:', error);
    return NextResponse.json(
      { error: 'Failed to stop all runs', details: error.message },
      { status: 500 }
    );
  }
}

