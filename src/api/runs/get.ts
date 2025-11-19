/**
 * GET /runs/:id - Get run details
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/utils/logger';
import { badRequestResponse, notFoundResponse, successResponse, serverErrorResponse } from '@/utils/api-response';
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
    const runId = event.pathParameters?.id;

    if (!runId) {
      return badRequestResponse('Run ID required');
    }

    // Get run
    const runResult = await docClient.send(
      new GetCommand({
        TableName: process.env.RUNS_TABLE!,
        Key: { id: runId },
      })
    );

    const run = runResult.Item;

    if (!run) {
      return notFoundResponse('Run');
    }

    // Extract and validate authentication
    const auth = extractAuthContext(event);
    if (!auth) {
      return badRequestResponse('Authentication required');
    }

    // Get podcast to verify access
    const podcastResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PODCASTS_TABLE!,
        Key: { id: run.podcastId },
      })
    );

    const podcast = podcastResult.Item;

    if (!podcast) {
      return notFoundResponse('Podcast');
    }

    // Verify user has access to this podcast
    if (!hasOrgAccess(auth, podcast.orgId)) {
      return badRequestResponse('You do not have access to this run');
    }

    logger.info('Retrieved run', { runId, podcastId: run.podcastId });

    return successResponse(run);
  } catch (error) {
    logger.error('Failed to get run', { error });
    return serverErrorResponse('Failed to retrieve run', error);
  }
};

