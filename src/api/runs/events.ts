/**
 * GET /runs/:id/events - Get run events for live progress tracking
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/utils/logger';
import { badRequestResponse, successResponse, serverErrorResponse } from '@/utils/api-response';
import { validateEnvironment } from '@/utils/auth-middleware';

// Lazy initialization for better testability
let dynamoClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return docClient;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Validate required environment variables
    validateEnvironment(['RUN_EVENTS_TABLE']);
    
    const docClient = getDocClient();
    const runId = event.pathParameters?.id;
    const nextToken = event.queryStringParameters?.nextToken;

    if (!runId) {
      return badRequestResponse('Run ID required');
    }

    // Validate and parse limit parameter
    const limitParam = event.queryStringParameters?.limit || '100';
    const limit = parseInt(limitParam);
    
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return badRequestResponse('Limit must be a number between 1 and 1000', {
        providedLimit: limitParam,
      });
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.RUN_EVENTS_TABLE!,
        IndexName: 'RunIdIndex',
        KeyConditionExpression: 'runId = :runId',
        ExpressionAttributeValues: {
          ':runId': runId,
        },
        Limit: limit,
        ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
        ScanIndexForward: false, // newest first
      })
    );

    const events = result.Items || [];
    const responseNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    logger.debug('Retrieved run events', { runId, count: events.length });

    return successResponse({
      events,
      nextToken: responseNextToken,
    });
  } catch (error) {
    logger.error('Failed to get run events', { error });
    return serverErrorResponse('Failed to retrieve run events', error);
  }
};

