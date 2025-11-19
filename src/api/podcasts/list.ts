/**
 * GET /podcasts - List user's podcasts
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/utils/logger';
import { successResponse, serverErrorResponse, badRequestResponse } from '@/utils/api-response';
import { extractAuthContext, validateEnvironment } from '@/utils/auth-middleware';

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
    
    // Extract and validate authentication
    const auth = extractAuthContext(event);
    if (!auth) {
      return badRequestResponse('Authentication required - Please log in');
    }

    const { userId, orgId, isLegacyUser } = auth;
    
    logger.info('Listing podcasts', { userId: userId.substring(0, 8) + '...', orgId: orgId.substring(0, 12) + '...', isLegacyUser });

    // Try to query by orgId first (new format)
    let result = await docClient.send(
      new QueryCommand({
        TableName: process.env.PODCASTS_TABLE!,
        IndexName: 'OrgIdIndex',
        KeyConditionExpression: 'orgId = :orgId',
        ExpressionAttributeValues: {
          ':orgId': orgId,
        },
        Limit: 50,
      })
    );

    // If no results and this is a legacy user, also check for podcasts without orgId
    // (old format podcasts that were created before orgId system)
    if ((!result.Items || result.Items.length === 0) && isLegacyUser) {
      logger.info('No podcasts found with orgId, checking for legacy podcasts without orgId');
      
      // Scan for podcasts without orgId (legacy format)
      // Note: This is less efficient but necessary for backward compatibility
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: process.env.PODCASTS_TABLE!,
          FilterExpression: 'attribute_not_exists(orgId)',
          Limit: 50,
        })
      );
      
      if (scanResult.Items && scanResult.Items.length > 0) {
        logger.info('Found legacy podcasts without orgId', { count: scanResult.Items.length });
        result = scanResult;
      }
    }

    logger.info('Listed podcasts', { orgId: orgId.substring(0, 12) + '...', count: result.Items?.length || 0 });

    return successResponse({
      podcasts: result.Items || [],
      nextToken: result.LastEvaluatedKey,
    });
  } catch (error) {
    logger.error('Failed to list podcasts', { error });
    return serverErrorResponse('Failed to list podcasts', error);
  }
};

