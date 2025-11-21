/**
 * POST /podcasts/:id/runs - Start a new podcast run
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { badRequestResponse, notFoundResponse, acceptedResponse, serverErrorResponse, forbiddenResponse } from '@/utils/api-response';
import { extractAuthContext, validateEnvironment, hasOrgAccess } from '@/utils/auth-middleware';

// Lazy initialization for better testability
let sfnClient: SFNClient | null = null;
let dynamoClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;

function getClients() {
  if (!docClient) {
    sfnClient = new SFNClient({});
    dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return { sfnClient: sfnClient!, docClient: docClient! };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Validate required environment variables
    validateEnvironment(['PODCASTS_TABLE', 'PODCAST_CONFIGS_TABLE', 'RUNS_TABLE', 'STATE_MACHINE_ARN']);
    
    const { sfnClient, docClient } = getClients();
    const podcastId = event.pathParameters?.id;

    if (!podcastId) {
      return badRequestResponse('Podcast ID required');
    }
    
    // Extract and validate authentication
    const auth = extractAuthContext(event);
    if (!auth) {
      return badRequestResponse('Authentication required');
    }

    // Get podcast and config
    const podcastResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PODCASTS_TABLE!,
        Key: { id: podcastId },
      })
    );

    const podcast = podcastResult.Item;

    if (!podcast) {
      return notFoundResponse('Podcast');
    }

    // Verify user has access to this podcast
    if (!hasOrgAccess(auth, podcast.orgId)) {
      return forbiddenResponse('You do not have access to this podcast');
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
      return serverErrorResponse('Podcast configuration not found');
    }

    // Fetch topics for this config version
    const topicsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.PODCAST_TOPICS_TABLE!,
        KeyConditionExpression: 'podcastId = :pid',
        FilterExpression: '#version = :version',
        ExpressionAttributeNames: {
          '#version': 'version',
        },
        ExpressionAttributeValues: {
          ':pid': podcastId,
          ':version': podcast.currentConfigVersion,
        },
      })
    );

    // Fetch competitors for this config version
    const competitorsResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.PODCAST_COMPETITORS_TABLE!,
        KeyConditionExpression: 'podcastId = :pid',
        FilterExpression: '#version = :version',
        ExpressionAttributeNames: {
          '#version': 'version',
        },
        ExpressionAttributeValues: {
          ':pid': podcastId,
          ':version': podcast.currentConfigVersion,
        },
      })
    );

    // Group topics by type
    const standardTopics = (topicsResult.Items || [])
      .filter((t: any) => t.type === 'standard')
      .map((t: any) => ({
        id: t.topicId,
        name: t.topicName || t.topicId,
        priorityWeight: t.priorityWeight || 1,
      }));
    
    const specialTopics = (topicsResult.Items || [])
      .filter((t: any) => t.type === 'special')
      .map((t: any) => ({
        id: t.topicId,
        name: t.topicName || t.topicId,
        priorityWeight: t.priorityWeight || 1,
      }));

    // Map competitors
    const competitors = (competitorsResult.Items || []).map((c: any) => ({
      id: c.companyId,
      name: c.companyName || c.companyId,
    }));

    // Parse flags from request
    const body = event.body ? JSON.parse(event.body) : {};
    const flags = body.flags || {};

    const runId = uuidv4();
    const now = new Date().toISOString();

    // Initialize progress structure with all pipeline stages
    const initialStages = {
      prepare: { status: 'pending' as const },
      discover: { status: 'pending' as const },
      disambiguate: { status: 'pending' as const },
      rank: { status: 'pending' as const },
      scrape: { status: 'pending' as const },
      extract: { status: 'pending' as const },
      summarize: { status: 'pending' as const },
      contrast: { status: 'pending' as const },
      outline: { status: 'pending' as const },
      script: { status: 'pending' as const },
      qa: { status: 'pending' as const },
      tts: { status: 'pending' as const },
      package: { status: 'pending' as const },
    };

    // Create run record
    const run = {
      id: runId,
      podcastId,
      configVersion: podcast.currentConfigVersion,
      status: 'pending' as const,
      progress: {
        currentStage: 'prepare',
        stages: initialStages,
      },
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
        company: { 
          id: config.companyId, 
          name: config.companyName || config.companyId // Use companyName if available, fallback to ID
        },
        industry: { 
          id: config.industryId, 
          name: config.industryName || config.industryId // Use industryName if available, fallback to ID
        },
        competitors,
        topics: { standard: standardTopics, special: specialTopics },
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
          llm: flags.provider?.llm || 'openai', // Use OpenAI in production
          tts: flags.provider?.tts || 'openai', // Use OpenAI in production
          // Respect http provider flag - can be 'openai' (node-fetch), 'playwright', 'replay', or 'stub'
          http: flags.provider?.http || 'openai',
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

    logger.info('Step Functions execution started', { runId, podcastId, executionArn: result.executionArn });

    // Update run status to 'running' and store executionArn
    run.status = 'running';
    run.startedAt = now;
    run.executionArn = result.executionArn;
    run.progress.stages.prepare.status = 'running';
    run.progress.stages.prepare.startedAt = now;

    await docClient.send(
      new PutCommand({
        TableName: process.env.RUNS_TABLE!,
        Item: run,
      })
    );

    logger.info('Run status updated to running', { runId, podcastId });

    return acceptedResponse({
      ...run,
      runId: run.id, // Include runId for frontend compatibility
      executionArn: result.executionArn,
    });
  } catch (error) {
    logger.error('Failed to start run', { error });
    return serverErrorResponse('Failed to start run', error);
  }
};

