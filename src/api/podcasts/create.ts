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
    // Extract user context FIRST - before any other processing
    // Handle both REST API and HTTP API authorizer structures
    const requestContext = event.requestContext || {};
    const authorizer = requestContext.authorizer;
    
    // Try multiple auth context structures (REST API vs HTTP API)
    const userId = authorizer?.claims?.sub || 
                   authorizer?.jwt?.claims?.sub || 
                   requestContext.authorizer?.lambda?.sub;
    
    const orgId = authorizer?.claims?.['custom:org_id'] || 
                  authorizer?.jwt?.claims?.['custom:org_id'] ||
                  requestContext.authorizer?.lambda?.['custom:org_id'];

    // Log for debugging (will help diagnose the issue)
    logger.info('Create podcast request', {
      hasAuth: !!authorizer,
      hasUserId: !!userId,
      hasOrgId: !!orgId,
      authStructure: authorizer ? Object.keys(authorizer) : 'none'
    });

    // Require real authentication - no test bypasses
    if (!userId || !orgId) {
      logger.warn('Unauthorized podcast creation attempt', { userId, orgId });
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Unauthorized - Please log in with valid credentials',
          debug: process.env.NODE_ENV === 'development' ? {
            hasAuth: !!authorizer,
            hasUserId: !!userId,
            hasOrgId: !!orgId
          } : undefined
        }),
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validated = CreatePodcastRequestSchema.parse(body);

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
    logger.error('Failed to create podcast', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });

    // Determine status code based on error type
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error instanceof Error) {
      if (error.name === 'ZodError' || error.message.includes('validation')) {
        statusCode = 400;
        errorMessage = `Validation error: ${error.message}`;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3)
        } : undefined
      }),
    };
  }
};

