/**
 * POST /podcasts/:id/runs/:runId/resume - Resume a pipeline run from a specific stage
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { logger } from '@/utils/logger';
import { badRequestResponse, notFoundResponse, successResponse, serverErrorResponse, forbiddenResponse } from '@/utils/api-response';
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

const VALID_STAGES = [
  'prepare',
  'discover',
  'disambiguate',
  'rank',
  'scrape',
  'extract',
  'summarize',
  'contrast',
  'outline',
  'script',
  'qa',
  'tts',
  'package',
];

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Validate required environment variables
    validateEnvironment(['RUNS_TABLE', 'PODCASTS_TABLE', 'PODCAST_CONFIGS_TABLE', 'STATE_MACHINE_ARN']);
    
    const { sfnClient, docClient } = getClients();
    const podcastId = event.pathParameters?.id;
    const runId = event.pathParameters?.runId;

    if (!podcastId || !runId) {
      return badRequestResponse('Podcast ID and Run ID required');
    }

    // Extract and validate authentication
    const auth = extractAuthContext(event);
    if (!auth) {
      return badRequestResponse('Authentication required');
    }

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const fromStage = body.fromStage;

    if (!fromStage || !VALID_STAGES.includes(fromStage)) {
      return badRequestResponse(`Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`);
    }

    // Get run
    const runResult = await docClient.send(
      new GetCommand({
        TableName: process.env.RUNS_TABLE!,
        Key: { id: runId },
      })
    );

    const run = runResult.Item;

    if (!run) {
      return notFoundResponse('Run');
    }

    // Verify run belongs to the podcast
    if (run.podcastId !== podcastId) {
      return badRequestResponse('Run does not belong to this podcast');
    }

    // Get podcast to verify access
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
      return forbiddenResponse('You do not have access to this run');
    }

    // Get config
    const configResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PODCAST_CONFIGS_TABLE!,
        Key: {
          podcastId,
          version: run.configVersion || podcast.currentConfigVersion,
        },
      })
    );

    const config = configResult.Item;

    if (!config) {
      return serverErrorResponse('Podcast configuration not found');
    }

    const now = new Date().toISOString();

    // Update run status to running and set current stage
    // First, get the current run to update progress structure
    const updatedRun = {
      ...run,
      status: 'running',
      updatedAt: now,
      startedAt: run.startedAt || now,
      progress: {
        ...run.progress,
        currentStage: fromStage,
        stages: {
          ...run.progress?.stages,
          [fromStage]: {
            status: 'running',
            startedAt: now,
            ...run.progress?.stages?.[fromStage],
          },
        },
      },
    };

    await docClient.send(
      new UpdateCommand({
        TableName: process.env.RUNS_TABLE!,
        Key: { id: runId },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #progress = :progress, #startedAt = if_not_exists(#startedAt, :startedAt)',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
          '#progress': 'progress',
          '#startedAt': 'startedAt',
        },
        ExpressionAttributeValues: {
          ':status': 'running',
          ':updatedAt': now,
          ':progress': updatedRun.progress,
          ':startedAt': now,
        },
      })
    );

    // Build Step Functions input (similar to create, but starting from specific stage)
    const pipelineInput = {
      runId,
      podcastId,
      configVersion: run.configVersion || podcast.currentConfigVersion,
      config: {
        title: podcast.title,
        subtitle: podcast.subtitle,
        description: podcast.description,
        author: podcast.author,
        email: podcast.email,
        category: podcast.category,
        explicit: podcast.explicit,
        language: podcast.language,
        coverArtS3Key: podcast.coverArtS3Key || '',
        company: { id: config.companyId, name: config.companyName || config.companyId },
        industry: { id: config.industryId, name: config.industryName || config.industryId },
        competitors: [], // TODO: fetch from competitors table
        topics: { standard: [], special: [] }, // TODO: fetch from topics table
        cadence: config.cadence,
        durationMinutes: config.durationMinutes,
        publishTime: config.publishTime,
        timezone: config.timezone,
        timeWindowHours: config.timeWindowHours,
        regions: config.regionFilters,
        sourceLanguages: config.sourceLanguages || [podcast.language],
        voice: config.voiceConfig,
        robotsMode: config.robotsMode,
        sourcePolicies: config.sourcePolicies,
      },
      flags: {
        dryRun: false,
        provider: {
          llm: 'openai',
          tts: 'openai',
          http: 'openai',
        },
        cassetteKey: 'default',
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
        resumeFromStage: fromStage, // Indicate we're resuming from this stage
      },
    };

    // Start new Step Functions execution
    const result = await sfnClient.send(
      new StartExecutionCommand({
        stateMachineArn: process.env.STATE_MACHINE_ARN!,
        name: `${runId}-resume-${Date.now()}`, // Unique name for resume execution
        input: JSON.stringify(pipelineInput),
      })
    );

    logger.info('Run resumed', { runId, podcastId, fromStage, executionArn: result.executionArn });

    return successResponse({
      runId,
      podcastId,
      fromStage,
      status: 'running',
      executionArn: result.executionArn,
      message: `Pipeline resumed from ${fromStage} stage`,
    });
  } catch (error) {
    logger.error('Failed to resume run', { error });
    return serverErrorResponse('Failed to resume run', error);
  }
};

