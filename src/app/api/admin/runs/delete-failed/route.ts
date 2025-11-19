/**
 * API Route: Delete All Failed Runs
 * POST /api/admin/runs/delete-failed - Delete all failed runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const RUNS_TABLE = process.env.RUNS_TABLE || 'runs';

function getDynamoClient() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  return DynamoDBDocumentClient.from(client);
}

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
  await client.send(new DeleteCommand({
    TableName: RUNS_TABLE,
    Key: { id: run.id },
  }));
}

export async function POST(request: NextRequest) {
  try {
    const failedRuns = await getAllFailedRuns();
    
    if (failedRuns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No failed runs found',
        deleted: 0,
      });
    }

    let successCount = 0;
    let failureCount = 0;

    for (const run of failedRuns) {
      try {
        await deleteRun(run);
        successCount++;
      } catch (error: any) {
        console.error(`Failed to delete run ${run.id}:`, error);
        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${successCount} failed run(s)`,
      deleted: successCount,
      failed: failureCount,
      total: failedRuns.length,
    });
  } catch (error: any) {
    console.error('Failed to delete failed runs:', error);
    return NextResponse.json(
      { error: 'Failed to delete failed runs', details: error.message },
      { status: 500 }
    );
  }
}

