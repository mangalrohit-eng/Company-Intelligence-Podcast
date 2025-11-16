/**
 * GET /runs - List runs with optional status filter
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/utils/logger';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const status = event.queryStringParameters?.status;
    
    // Query runs table
    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.RUNS_TABLE || 'runs',
        Limit: 50,
        FilterExpression: status ? 'runStatus = :status' : undefined,
        ExpressionAttributeValues: status ? { ':status': status } : undefined,
      })
    );

    // For each run, fetch the latest events to get stage progress
    const runsWithProgress = await Promise.all(
      (result.Items || []).map(async (run) => {
        // Get events for this run
        const eventsResult = await docClient.send(
          new ScanCommand({
            TableName: process.env.EVENTS_TABLE || 'run_events',
            FilterExpression: 'runId = :runId',
            ExpressionAttributeValues: {
              ':runId': run.id,
            },
            Limit: 100,
          })
        );

        // Parse events to build stage status
        const events = eventsResult.Items || [];
        const stages: Record<string, any> = {};
        
        // Initialize all stages
        const stageNames = [
          'prepare', 'discover', 'disambiguate', 'rank', 'scrape',
          'extract', 'summarize', 'contrast', 'outline', 'script',
          'qa', 'tts', 'package'
        ];
        
        stageNames.forEach(stage => {
          stages[stage] = { status: 'pending', progress: 0 };
        });

        // Update stages based on events
        events.forEach(event => {
          const stage = event.stage;
          if (stage && stages[stage]) {
            stages[stage] = {
              status: event.level === 'error' ? 'failed' : 
                      event.pct === 100 ? 'completed' : 'in_progress',
              progress: event.pct || 0,
              message: event.message,
              durationMs: event.durationMs,
              startTime: event.ts,
            };
          }
        });

        return {
          id: run.id,
          podcastId: run.podcastId,
          podcastName: run.podcastName || 'Unknown Podcast',
          overallStatus: run.runStatus || 'running',
          overallProgress: run.progress || 0,
          startedAt: run.createdAt,
          stages,
        };
      })
    );

    // Calculate stats
    const totalRuns = runsWithProgress.length;
    const activeRuns = runsWithProgress.filter(r => r.overallStatus === 'running').length;
    const completedToday = runsWithProgress.filter(r => {
      const runDate = new Date(r.startedAt);
      const today = new Date();
      return runDate.toDateString() === today.toDateString() && r.overallStatus === 'completed';
    }).length;

    const avgDuration = runsWithProgress
      .filter(r => r.overallStatus === 'completed')
      .reduce((sum, r) => {
        const duration = (new Date(r.startedAt).getTime() - Date.now()) / 1000 / 60;
        return sum + Math.abs(duration);
      }, 0) / Math.max(completedToday, 1);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        runs: runsWithProgress,
        stats: {
          totalRuns,
          activeRuns,
          completedToday,
          avgDuration: avgDuration.toFixed(1),
        },
      }),
    };
  } catch (error) {
    logger.error('Failed to list runs', { error });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};

