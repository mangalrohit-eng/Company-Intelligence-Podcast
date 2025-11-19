/**
 * GET /podcasts/:id/runs - List runs for a podcast
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/utils/logger';
import { badRequestResponse, successResponse, serverErrorResponse } from '@/utils/api-response';
import { extractAuthContext, validateEnvironment, hasOrgAccess } from '@/utils/auth-middleware';

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
    validateEnvironment(['RUNS_TABLE', 'PODCASTS_TABLE']);
    
    const docClient = getDocClient();
    const podcastId = event.pathParameters?.id;

    if (!podcastId) {
      return badRequestResponse('Podcast ID required');
    }

    // Extract and validate authentication
    const auth = extractAuthContext(event);
    if (!auth) {
      return badRequestResponse('Authentication required');
    }

    // Get podcast to verify access
    const podcastResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.PODCASTS_TABLE!,
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': podcastId,
        },
        Limit: 1,
      })
    );

    const podcast = podcastResult.Items?.[0];

    if (!podcast) {
      return badRequestResponse('Podcast not found');
    }

    // Verify user has access to this podcast
    if (!hasOrgAccess(auth, podcast.orgId)) {
      return badRequestResponse('You do not have access to this podcast');
    }

    // Query runs by podcastId
    const limitParam = event.queryStringParameters?.limit || '50';
    const limit = parseInt(limitParam);
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return badRequestResponse('Limit must be a number between 1 and 100');
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.RUNS_TABLE!,
        IndexName: 'PodcastIdIndex',
        KeyConditionExpression: 'podcastId = :podcastId',
        ExpressionAttributeValues: {
          ':podcastId': podcastId,
        },
        Limit: limit,
        ScanIndexForward: false, // newest first
        ExclusiveStartKey: event.queryStringParameters?.nextToken
          ? JSON.parse(Buffer.from(event.queryStringParameters.nextToken, 'base64').toString())
          : undefined,
      })
    );

    const runs = result.Items || [];
    const responseNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    logger.info('Listed runs', { podcastId, count: runs.length });

    return successResponse({
      runs,
      nextToken: responseNextToken,
    });
  } catch (error) {
    logger.error('Failed to list runs', { error });
    return serverErrorResponse('Failed to list runs', error);
  }
};

