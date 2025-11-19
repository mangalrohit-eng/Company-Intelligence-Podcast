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

    // If no results, also check for legacy podcasts without orgId
    // (old format podcasts that were created before orgId system)
    // This handles the case where user has orgId but podcasts don't (or vice versa)
    if (!result.Items || result.Items.length === 0) {
      logger.info('No podcasts found with orgId, checking for legacy podcasts without orgId', {
        orgId: orgId.substring(0, 12) + '...',
        isLegacyUser,
      });
      
      // Scan for podcasts without orgId (legacy format)
      // Note: This is less efficient but necessary for backward compatibility
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: process.env.PODCASTS_TABLE!,
          FilterExpression: 'attribute_not_exists(orgId)',
          Limit: 50,
        })
      );
      
      logger.info('Legacy scan completed', {
        found: scanResult.Items?.length || 0,
        scannedCount: scanResult.ScannedCount || 0,
      });
      
      if (scanResult.Items && scanResult.Items.length > 0) {
        logger.info('Found legacy podcasts without orgId', { 
          count: scanResult.Items.length,
          podcastIds: scanResult.Items.map((p: any) => p.id).slice(0, 5),
        });
        result = scanResult;
      } else {
        logger.warn('No legacy podcasts found either', {
          scannedCount: scanResult.ScannedCount || 0,
        });
      }
    }

    logger.info('Listed podcasts', { orgId: orgId.substring(0, 12) + '...', count: result.Items?.length || 0 });

    // Transform podcasts to ensure frontend compatibility
    // Legacy podcasts might be missing some fields that the frontend expects
    const transformedPodcasts = (result.Items || []).map((podcast: any) => {
      // Ensure all required fields exist with defaults
      return {
        ...podcast,
        // Frontend expects these fields
        subtitle: podcast.subtitle || podcast.title || '',
        coverArtUrl: podcast.coverArtUrl || '',
        cadence: podcast.config?.schedule || podcast.cadence || 'manual',
        status: podcast.status || 'active',
        updatedAt: podcast.updatedAt || podcast.createdAt || new Date().toISOString(),
        // Map old format fields to new format if needed
        lastRun: podcast.lastRunAt || podcast.lastRun,
        nextRun: podcast.nextRunAt || podcast.nextRun,
      };
    });

    logger.info('Transformed podcasts for frontend', { 
      count: transformedPodcasts.length,
      sampleIds: transformedPodcasts.slice(0, 3).map((p: any) => p.id),
    });

    return successResponse({
      podcasts: transformedPodcasts,
      nextToken: result.LastEvaluatedKey,
    });
  } catch (error) {
    logger.error('Failed to list podcasts', { error });
    return serverErrorResponse('Failed to list podcasts', error);
  }
};

