/**
 * POST /podcasts - Create a new podcast
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreatePodcastRequestSchema } from '@/types/api';
import { createdResponse, badRequestResponse, serverErrorResponse } from '@/utils/api-response';
import { extractAuthContext, validateEnvironment } from '@/utils/auth-middleware';
import { logger } from '@/utils/logger';

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
    validateEnvironment(['PODCASTS_TABLE', 'PODCAST_CONFIGS_TABLE', 'PODCAST_COMPETITORS_TABLE', 'PODCAST_TOPICS_TABLE', 'CLOUDFRONT_DOMAIN']);
    
    const docClient = getDocClient();
    
    logger.info('Create podcast request received');
    
    // Extract and validate authentication
    const auth = extractAuthContext(event);
    if (!auth) {
      return badRequestResponse('Authentication required - You must be logged in to create a podcast');
    }

    const { userId, orgId, isLegacyUser } = auth;
    
    if (isLegacyUser) {
      logger.warn('Legacy user creating podcast', { userId: userId.substring(0, 8) + '...', orgId });
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validated = CreatePodcastRequestSchema.parse(body);

    const podcastId = uuidv4();
    const now = new Date().toISOString();
    
    // Generate UUIDs for string-based IDs (company, industry, topics, competitors)
    // This allows the API to accept human-readable names instead of requiring UUIDs
    const companyUuid = uuidv4(); // In future, look up or create company by name
    const industryUuid = uuidv4(); // In future, look up or create industry by name
    const competitorUuids = validated.competitorIds?.map(() => uuidv4()) || [];
    const topicUuids = validated.topicIds.map(() => uuidv4());

    // Create podcast record
    const podcast = {
      id: podcastId,
      orgId,
      ownerUserId: userId,
      title: validated.title,
      subtitle: validated.subtitle,
      description: validated.description,
      author: validated.author,
      email: validated.email,
      category: validated.category,
      explicit: validated.explicit,
      language: validated.language,
      coverArtS3Key: '',
      rssUrl: `${process.env.CLOUDFRONT_DOMAIN}/rss/${podcastId}.xml`,
      status: 'draft',
      currentConfigVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.PODCASTS_TABLE!,
        Item: podcast,
      })
    );

    // Create initial config
    const config = {
      podcastId,
      version: 1,
      cadence: validated.cadence,
      durationMinutes: validated.durationMinutes,
      timeWindowHours: validated.timeWindowHours,
      timezone: validated.timezone,
      publishTime: validated.publishTime,
      companyId: companyUuid, // Use generated UUID
      companyName: validated.companyId, // Store the actual name
      industryId: industryUuid, // Use generated UUID
      industryName: validated.industryId, // Store the actual name
      voiceConfig: {
        provider: 'openai-tts',
        voiceId: validated.voiceId,
        speed: validated.voiceSpeed,
        tone: validated.voiceTone,
      },
      robotsMode: validated.robotsMode,
      regionFilters: validated.regions || ['US'],
      sourceLanguages: validated.sourceLanguages,
      topicPriorities: validated.topicPriorities || {},
      sourcePolicies: {
        allowDomains: validated.allowDomains || [],
        blockDomains: validated.blockDomains || [],
      },
      createdAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.PODCAST_CONFIGS_TABLE!,
        Item: config,
      })
    );

    // Store competitors
    for (let i = 0; i < (validated.competitorIds?.length || 0); i++) {
      const competitorName = validated.competitorIds![i];
      const competitorUuid = competitorUuids[i];
      
      await docClient.send(
        new PutCommand({
          TableName: process.env.PODCAST_COMPETITORS_TABLE!,
          Item: {
            podcastId,
            version: 1,
            companyId: competitorUuid, // UUID for DB relations
            companyName: competitorName, // Human-readable name
            isAiSuggested: false,
            createdAt: now,
          },
        })
      );
    }

    // Store topics
    for (let i = 0; i < validated.topicIds.length; i++) {
      const topicName = validated.topicIds[i];
      const topicUuid = topicUuids[i];
      
      await docClient.send(
        new PutCommand({
          TableName: process.env.PODCAST_TOPICS_TABLE!,
          Item: {
            podcastId,
            version: 1,
            topicId: topicUuid, // UUID for DB relations
            topicName: topicName, // Human-readable name
            type: 'standard',
            priorityWeight: validated.topicPriorities?.[topicName] || 50,
            createdAt: now,
          },
        })
      );
    }

    logger.info('Podcast created successfully', { podcastId, userId: userId.substring(0, 8) + '...' });

    return createdResponse({
      ...podcast,
      config,
    });
  } catch (error: any) {
    logger.error('Failed to create podcast', { error });

    // Handle validation errors specifically
    if (error.name === 'ZodError') {
      return badRequestResponse('Validation error', error.issues);
    }

    return serverErrorResponse('Failed to create podcast', error);
  }
};
