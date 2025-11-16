/**
 * POST /podcasts - Create a new podcast
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreatePodcastRequestSchema } from '@/types/api';
import { logger } from '@/utils/logger';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validated = CreatePodcastRequestSchema.parse(body);

    // Extract user context from authorizer
    // TEMPORARY BYPASS FOR TESTING - TODO: Re-enable for production
    const userId = event.requestContext.authorizer?.claims?.sub || 'test-user-123';
    const orgId = event.requestContext.authorizer?.claims?.['custom:org_id'] || 'test-org-456';

    // Auth check disabled for testing
    // if (!userId || !orgId) {
    //   return {
    //     statusCode: 401,
    //     body: JSON.stringify({ error: 'Unauthorized' }),
    //   };
    // }

    const podcastId = uuidv4();
    const now = new Date().toISOString();

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
      coverArtS3Key: '', // Set after cover upload
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
      companyId: validated.companyId,
      industryId: validated.industryId,
      voiceConfig: {
        provider: 'openai-tts',
        voiceId: validated.voiceId,
        speed: validated.voiceSpeed,
        tone: validated.voiceTone,
      },
      robotsMode: validated.robotsMode,
      regionFilters: validated.regions,
      topicPriorities: validated.topicPriorities,
      sourcePolicies: {
        allowDomains: validated.allowDomains,
        blockDomains: validated.blockDomains,
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
    for (const competitorId of validated.competitorIds) {
      await docClient.send(
        new PutCommand({
          TableName: process.env.PODCAST_COMPETITORS_TABLE!,
          Item: {
            podcastId,
            version: 1,
            companyId: competitorId,
            isAiSuggested: false,
            createdAt: now,
          },
        })
      );
    }

    // Store topics
    for (const topicId of validated.topicIds) {
      await docClient.send(
        new PutCommand({
          TableName: process.env.PODCAST_TOPICS_TABLE!,
          Item: {
            podcastId,
            version: 1,
            topicId,
            type: 'standard',
            priorityWeight: validated.topicPriorities[topicId] || 50,
            createdAt: now,
          },
        })
      );
    }

    logger.info('Podcast created', { podcastId, orgId, userId });

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ...podcast,
        config,
      }),
    };
  } catch (error) {
    logger.error('Failed to create podcast', { error });

    return {
      statusCode: error instanceof Error && error.name === 'ZodError' ? 400 : 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};

