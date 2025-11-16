/**
 * GET /episodes/:id - Get episode details
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@/utils/logger';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const episodeId = event.pathParameters?.id;

    if (!episodeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Episode ID required' }),
      };
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.EPISODES_TABLE!,
        Key: { id: episodeId },
      })
    );

    const episode = result.Item;

    if (!episode) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Episode not found' }),
      };
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ...episode,
        audioUrl,
        transcriptUrl,
        showNotesUrl,
      }),
    };
  } catch (error) {
    logger.error('Failed to get episode', { error });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
};

