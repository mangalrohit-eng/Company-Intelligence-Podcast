/**
 * POST /podcasts/:id/runs - Start a new podcast run
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

const sfnClient = new SFNClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const podcastId = event.pathParameters?.id;
    // TEMPORARY BYPASS FOR TESTING - TODO: Re-enable for production
    const orgId = event.requestContext.authorizer?.claims?.['custom:org_id'] || 'test-org-456';

    if (!podcastId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request - missing podcastId' }),
      };
    }
    
    // Auth check disabled for testing
    // if (!orgId) {
    //   return {
    //     statusCode: 401,
    //     body: JSON.stringify({ error: 'Unauthorized' }),
    //   };
    // }

    // Get podcast and config
    const podcastResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PODCASTS_TABLE!,
        Key: { id: podcastId },
      })
    );

    const podcast = podcastResult.Item;

    if (!podcast || podcast.orgId !== orgId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Podcast not found' }),
      };
    }

    const configResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PODCAST_CONFIGS_TABLE!,
        Key: {
          podcastId,
          version: podcast.currentConfigVersion,
        },
      })
    );

    const config = configResult.Item;

    if (!config) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Podcast configuration not found' }),
      };
    }

    // Parse flags from request
    const body = event.body ? JSON.parse(event.body) : {};
    const flags = body.flags || {};

    const runId = uuidv4();
    const now = new Date().toISOString();

    // Create run record
    const run = {
      id: runId,
      podcastId,
      configVersion: podcast.currentConfigVersion,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.RUNS_TABLE!,
        Item: run,
      })
    );

    // Build Step Functions input
    const pipelineInput = {
      runId,
      podcastId,
      configVersion: podcast.currentConfigVersion,
      config: {
        // Map config to PodcastConfigSnapshot format
        title: podcast.title,
        subtitle: podcast.subtitle,
        description: podcast.description,
        author: podcast.author,
        email: podcast.email,
        category: podcast.category,
        explicit: podcast.explicit,
        language: podcast.language,
        coverArtS3Key: podcast.coverArtS3Key,
        company: { id: config.companyId, name: config.companyId }, // TODO: resolve names
        industry: { id: config.industryId, name: config.industryId },
        competitors: [], // TODO: fetch from competitors table
        topics: { standard: [], special: [] }, // TODO: fetch from topics table
        cadence: config.cadence,
        durationMinutes: config.durationMinutes,
        publishTime: config.publishTime,
        timezone: config.timezone,
        timeWindowHours: config.timeWindowHours,
        regions: config.regionFilters,
        sourceLanguages: [podcast.language],
        voice: config.voiceConfig,
        robotsMode: config.robotsMode,
        sourcePolicies: config.sourcePolicies,
      },
      flags: {
        dryRun: flags.dryRun || false,
        provider: {
          llm: flags.provider?.llm || 'replay',
          tts: flags.provider?.tts || 'stub',
          http: flags.provider?.http || 'replay',
        },
        cassetteKey: flags.cassetteKey || 'default',
        enable: {
          discover: true,
          scrape: true,
          extract: true,
          summarize: true,
          contrast: true,
          outline: true,
          script: true,
          qa: true,
          tts: true,
          package: true,
        },
      },
    };

    // Start Step Functions execution
    const result = await sfnClient.send(
      new StartExecutionCommand({
        stateMachineArn: process.env.STATE_MACHINE_ARN!,
        name: runId,
        input: JSON.stringify(pipelineInput),
      })
    );

    logger.info('Run started', { runId, podcastId, executionArn: result.executionArn });

    return {
      statusCode: 202,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ...run,
        executionArn: result.executionArn,
      }),
    };
  } catch (error) {
    logger.error('Failed to start run', { error });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
};

