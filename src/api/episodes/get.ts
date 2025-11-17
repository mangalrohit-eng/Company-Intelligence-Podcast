/**
 * GET /episodes/:id - Get episode details
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@/utils/logger';
import { badRequestResponse, notFoundResponse, successResponse, serverErrorResponse } from '@/utils/api-response';
import { validateEnvironment } from '@/utils/auth-middleware';

// Lazy initialization for better testability
let dynamoClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;
let s3Client: S3Client | null = null;

function getClients() {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
    s3Client = new S3Client({});
  }
  return { docClient: docClient!, s3Client: s3Client! };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Validate required environment variables
    validateEnvironment(['EPISODES_TABLE', 'S3_BUCKET_MEDIA']);
    
    const { docClient, s3Client } = getClients();
    const episodeId = event.pathParameters?.id;

    if (!episodeId) {
      return badRequestResponse('Episode ID required');
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.EPISODES_TABLE!,
        Key: { id: episodeId },
      })
    );

    const episode = result.Item;

    if (!episode) {
      return notFoundResponse('Episode');
    }

    // Generate presigned URLs for media
    const bucket = process.env.S3_BUCKET_MEDIA!;
    
    const audioUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: episode.mp3S3Key,
      }),
      { expiresIn: 3600 }
    );

    const transcriptUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: episode.transcriptS3Key,
      }),
      { expiresIn: 3600 }
    );

    const showNotesUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: episode.showNotesS3Key,
      }),
      { expiresIn: 3600 }
    );

    logger.info('Retrieved episode', { episodeId });

    return successResponse({
      ...episode,
      audioUrl,
      transcriptUrl,
      showNotesUrl,
    });
  } catch (error) {
    logger.error('Failed to get episode', { error });
    return serverErrorResponse('Failed to retrieve episode', error);
  }
};

