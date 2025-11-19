/**
 * GET /podcasts/:id - Get podcast details
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
    validateEnvironment(['PODCASTS_TABLE']);
    
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

    // Get podcast
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.PODCASTS_TABLE!,
        Key: { id: podcastId },
      })
    );

    const podcast = result.Item;

    if (!podcast) {
      return notFoundResponse('Podcast');
    }

    // Verify user has access to this podcast
    if (!hasOrgAccess(auth, podcast.orgId)) {
      return badRequestResponse('You do not have access to this podcast');
    }

    logger.info('Retrieved podcast', { podcastId });

    return successResponse(podcast);
  } catch (error) {
    logger.error('Failed to get podcast', { error });
    return serverErrorResponse('Failed to retrieve podcast', error);
  }
};

