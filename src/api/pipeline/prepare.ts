/**
 * Prepare Stage Lambda
 * Updates run status and returns success (stub for now)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/utils/logger';
import { validateEnvironment } from '@/utils/auth-middleware';

let dynamoClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return docClient;
}

export const handler = async (event: any): Promise<any> => {
  try {
    // Validate required environment variables
    validateEnvironment(['RUNS_TABLE']);
    
    // Step Functions invokes Lambda with format: { FunctionName, Payload }
    // The actual input is in event.Payload (stringified JSON)
    let payload: any;
    
    if (event.Payload) {
      // Step Functions format - Payload is a string
      payload = typeof event.Payload === 'string' ? JSON.parse(event.Payload) : event.Payload;
    } else {
      // Direct invoke format
      payload = event;
    }
    
    logger.info('Prepare Lambda invoked', { 
      hasPayload: !!event.Payload,
      payloadKeys: payload ? Object.keys(payload) : [],
      runId: payload?.runId 
    });
    
    const { runId, config } = payload;
    
    if (!runId) {
      logger.error('runId is missing', { event, payload });
      throw new Error('runId is required');
    }

    const docClient = getDocClient();
    const now = new Date().toISOString();

    logger.info('Prepare stage started', { runId });

    // Update run status - prepare stage started
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.RUNS_TABLE!,
        Key: { id: runId },
        UpdateExpression: 'SET progress.stages.prepare.status = :status, progress.stages.prepare.startedAt = :startedAt, progress.currentStage = :currentStage, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':status': 'running',
          ':startedAt': now,
          ':currentStage': 'prepare',
          ':updatedAt': now,
        },
      })
    );

    // Simulate some work (in real implementation, this would run the actual prepare stage)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update run status - prepare stage completed
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.RUNS_TABLE!,
        Key: { id: runId },
        UpdateExpression: 'SET progress.stages.prepare.status = :status, progress.stages.prepare.completedAt = :completedAt, progress.currentStage = :nextStage, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':status': 'completed',
          ':completedAt': new Date().toISOString(),
          ':nextStage': 'discover',
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    logger.info('Prepare stage completed', { runId });

    // Return prepare output (Step Functions expects this format)
    return {
      frozenConfig: config || {},
      speechBudgetWords: (config?.durationMinutes || 5) * 150,
      evidenceTargetUnits: Math.round((config?.durationMinutes || 5) * 2),
      topicAllocations: {},
      globalTimeBudgetSeconds: (config?.durationMinutes || 5) * 60,
    };
  } catch (error: any) {
    logger.error('Prepare stage failed', { error, runId: event.runId || event.Payload?.runId });
    throw error;
  }
};

