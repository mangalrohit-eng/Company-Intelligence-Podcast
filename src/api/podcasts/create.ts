/**
 * POST /podcasts - Create a new podcast
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreatePodcastRequestSchema } from '@/types/api';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('='.repeat(80));
  console.log('CREATE PODCAST HANDLER - START');
  console.log('='.repeat(80));
  
  // Log full event for debugging
  console.log('Event keys:', Object.keys(event));
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  console.log('RequestContext:', JSON.stringify(event.requestContext, null, 2));
  
  try {
    // Extract auth context
    const requestContext = event.requestContext as any;
    const authorizer = requestContext?.authorizer;
    
    console.log('Authorizer object:', JSON.stringify(authorizer, null, 2));
    
    // Try multiple auth context structures
    const userId = authorizer?.claims?.sub || 
                   authorizer?.jwt?.claims?.sub || 
                   authorizer?.lambda?.sub ||
                   null;
    
    const orgId = authorizer?.claims?.['custom:org_id'] || 
                  authorizer?.jwt?.claims?.['custom:org_id'] ||
                  authorizer?.lambda?.['custom:org_id'] ||
                  null;

    console.log('Extracted auth:', { 
      hasAuthorizer: !!authorizer,
      authorizerKeys: authorizer ? Object.keys(authorizer) : [],
      userId, 
      orgId,
      hasAuthHeader: !!event.headers?.Authorization || !!event.headers?.authorization
    });

    // Require authentication
    if (!userId || !orgId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Unauthorized - Authentication required',
          message: 'You must be logged in to create a podcast',
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

    console.log('Podcast created successfully:', podcastId);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        ...podcast,
        config,
      }),
    };
  } catch (error: any) {
    console.error('Failed to create podcast:', error);

    // Determine status code
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.name === 'ZodError') {
      statusCode = 400;
      errorMessage = `Validation error: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: errorMessage,
      }),
    };
  }
};
