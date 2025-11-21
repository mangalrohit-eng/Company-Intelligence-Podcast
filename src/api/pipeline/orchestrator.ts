/**
 * Pipeline Orchestrator Lambda
 * Executes the full podcast pipeline and updates run status in DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { validateEnvironment } from '@/utils/auth-middleware';
import { logger } from '@/utils/logger';
import { PipelineOrchestrator } from '@/engine/orchestrator';
import { RealtimeEventEmitter } from '@/utils/realtime-event-emitter';

// Lazy initialization
let dynamoClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;
let secretsClient: SecretsManagerClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return docClient;
}

async function getOpenAiApiKey(): Promise<string> {
  // Try environment variable first (simplest approach)
  // Check if it exists, is not empty, and is not the string "None"
  const envKey = process.env.OPENAI_API_KEY;
  if (envKey && envKey.trim().length > 0 && envKey.trim().toLowerCase() !== 'none') {
    logger.info('Using OPENAI_API_KEY from environment variable');
    return envKey.trim();
  }

  // Fallback to Secrets Manager if OPENAI_SECRET_ARN is set AND OPENAI_API_KEY is not set
  const secretArn = process.env.OPENAI_SECRET_ARN;
  if (secretArn && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim().length === 0)) {
    logger.info('OPENAI_API_KEY not set, trying Secrets Manager', { secretArn });
    if (!secretsClient) {
      secretsClient = new SecretsManagerClient({});
    }

    try {
      const response = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: secretArn })
      );
      
      if (response.SecretString) {
        const secret = JSON.parse(response.SecretString);
        const apiKey = secret.apiKey || secret.OPENAI_API_KEY || response.SecretString;
        if (apiKey && apiKey.trim().length > 0) {
          return apiKey;
        }
      }
      
      if (response.SecretBinary) {
        const apiKey = Buffer.from(response.SecretBinary).toString('utf-8');
        if (apiKey && apiKey.trim().length > 0) {
          return apiKey;
        }
      }
    } catch (error: any) {
      logger.error('Failed to retrieve OpenAI API key from Secrets Manager', { error, secretArn });
      // Don't throw here - fall through to final error
    }
  }

  throw new Error('OPENAI_API_KEY environment variable must be set and not empty');
}

async function createEpisodeRecord(episode: {
  episodeId: string;
  podcastId: string;
  runId: string;
  title: string;
  description: string;
  pubDate: string;
  durationSeconds: number;
  mp3S3Key: string;
  transcriptS3Key: string;
  showNotesS3Key: string;
  sourcesS3Key: string;
}): Promise<void> {
  if (!process.env.EPISODES_TABLE) {
    logger.warn('EPISODES_TABLE not set, skipping episode creation');
    return;
  }
  
  const docClient = getDocClient();
  const now = new Date().toISOString();
  
  // Get episode number by counting existing episodes for this podcast
  // We'll use a simple approach: query episodes and count them
  // For now, we'll use a timestamp-based episode number
  const episodeNumber = Math.floor(Date.now() / 1000);
  
  const episodeRecord = {
    id: episode.episodeId,
    podcastId: episode.podcastId,
    runId: episode.runId,
    title: episode.title,
    description: episode.description,
    pubDate: episode.pubDate,
    durationSeconds: episode.durationSeconds,
    mp3S3Key: episode.mp3S3Key,
    transcriptS3Key: episode.transcriptS3Key,
    showNotesS3Key: episode.showNotesS3Key,
    sourcesS3Key: episode.sourcesS3Key,
    guid: `episode-${episode.episodeId}`,
    episodeNumber: episodeNumber,
    createdAt: now,
    updatedAt: now,
  };
  
  await docClient.send(
    new PutCommand({
      TableName: process.env.EPISODES_TABLE,
      Item: episodeRecord,
    })
  );
  
  logger.info('Episode record created in DynamoDB', { 
    episodeId: episode.episodeId, 
    podcastId: episode.podcastId 
  });
}

async function updateRunStatus(
  runId: string,
  updates: {
    status?: string;
    currentStage?: string;
    stageStatus?: string;
    stageStartedAt?: string;
    stageCompletedAt?: string;
    error?: string;
    output?: any;
    finishedAt?: string;
  }
): Promise<void> {
  const docClient = getDocClient();
  
  try {
    // Get current run to preserve existing data
    const getResult = await docClient.send(
      new GetCommand({
        TableName: process.env.RUNS_TABLE!,
        Key: { id: runId },
      })
    );

    const currentRun = getResult.Item || {};
    const now = new Date().toISOString();

    // Build updated run object
    const updatedRun: any = {
      ...currentRun,
      updatedAt: now,
    };

    if (updates.status) {
      updatedRun.status = updates.status;
    }

    if (updates.currentStage) {
      if (!updatedRun.progress) {
        updatedRun.progress = { currentStage: '', stages: {} };
      }
      updatedRun.progress.currentStage = updates.currentStage;
    }

    // Update stage-specific fields
    if (updates.currentStage && (updates.stageStatus || updates.stageStartedAt || updates.stageCompletedAt)) {
      if (!updatedRun.progress) {
        updatedRun.progress = { currentStage: '', stages: {} };
      }
      if (!updatedRun.progress.stages) {
        updatedRun.progress.stages = {};
      }
      if (!updatedRun.progress.stages[updates.currentStage]) {
        updatedRun.progress.stages[updates.currentStage] = {};
      }

      // Ensure status is always set (don't allow empty strings)
      if (updates.stageStatus) {
        updatedRun.progress.stages[updates.currentStage].status = updates.stageStatus;
      }
      if (updates.stageStartedAt) {
        updatedRun.progress.stages[updates.currentStage].startedAt = updates.stageStartedAt;
      }
      if (updates.stageCompletedAt) {
        updatedRun.progress.stages[updates.currentStage].completedAt = updates.stageCompletedAt;
      }
    }
    
    // Also update any stage that was explicitly mentioned in stageStatus but not currentStage
    // This handles markStageCompleted calls
    if (updates.stageStatus && !updates.currentStage && updatedRun.progress?.currentStage) {
      const stageToUpdate = updatedRun.progress.currentStage;
      if (!updatedRun.progress.stages) {
        updatedRun.progress.stages = {};
      }
      if (!updatedRun.progress.stages[stageToUpdate]) {
        updatedRun.progress.stages[stageToUpdate] = {};
      }
      updatedRun.progress.stages[stageToUpdate].status = updates.stageStatus;
      if (updates.stageCompletedAt) {
        updatedRun.progress.stages[stageToUpdate].completedAt = updates.stageCompletedAt;
      }
    }

    if (updates.error) {
      updatedRun.error = updates.error;
    }

    if (updates.output) {
      // Merge with existing output to preserve any fields that were set earlier
      updatedRun.output = {
        ...(updatedRun.output || {}),
        ...updates.output,
      };
    }

    if (updates.finishedAt) {
      updatedRun.finishedAt = updates.finishedAt;
    }

    // Use PutCommand to update the entire item (simpler than complex UpdateExpression)
    await docClient.send(
      new PutCommand({
        TableName: process.env.RUNS_TABLE!,
        Item: updatedRun,
      })
    );
  } catch (error) {
    logger.error('Failed to update run status', { runId, error });
    // Don't throw - status updates are best-effort
  }
}

export const handler = async (event: any): Promise<any> => {
  try {
    // Validate required environment variables (excluding OPENAI_API_KEY - we'll get it from Secrets Manager)
    validateEnvironment(['RUNS_TABLE', 'PODCASTS_TABLE', 'PODCAST_CONFIGS_TABLE', 'MEDIA_BUCKET', 'RSS_BUCKET', 'EPISODES_TABLE']);
    
    // Get OpenAI API key from Secrets Manager or environment
    const openaiApiKey = await getOpenAiApiKey();
    process.env.OPENAI_API_KEY = openaiApiKey; // Set it for the pipeline to use
    
    // Step Functions invokes Lambda with format: { FunctionName, Payload }
    // The actual input is in event.Payload (stringified JSON)
    let payload: any;
    
    if (event.Payload) {
      // Step Functions format - Payload is a string
      payload = typeof event.Payload === 'string' ? JSON.parse(event.Payload) : event.Payload;
    } else {
      // Direct invoke format
      payload = event;
    }
    
    const { runId, podcastId, config, flags } = payload;
    
    if (!runId || !podcastId || !config) {
      logger.error('Missing required fields', { runId, podcastId, hasConfig: !!config, payload });
      throw new Error('runId, podcastId, and config are required');
    }
    
    logger.info('Pipeline orchestrator started', { runId, podcastId });

    // Update run to running
    await updateRunStatus(runId, {
      status: 'running',
      currentStage: 'prepare',
      stageStatus: 'running',
      stageStartedAt: new Date().toISOString(),
    });

    // Create event emitter that updates DynamoDB
    const emitter = new RealtimeEventEmitter(async (update) => {
      const updates: any = {};
      
      if (update.currentStage || update.stage) {
        updates.currentStage = update.currentStage || update.stage;
      }
      
      if (update.stageStatus) {
        updates.stageStatus = update.stageStatus;
        updates.currentStage = updates.currentStage || update.currentStage || update.stage;
      }
      
      if (update.stageStartedAt) {
        updates.stageStartedAt = update.stageStartedAt;
        updates.currentStage = updates.currentStage || update.currentStage || update.stage;
      }
      
      if (update.stageCompletedAt) {
        updates.stageCompletedAt = update.stageCompletedAt;
        updates.currentStage = updates.currentStage || update.currentStage || update.stage;
      }
      
      if (update.error) {
        updates.error = update.error;
        updates.status = 'failed';
      }

      if (Object.keys(updates).length > 0) {
        await updateRunStatus(runId, updates);
      }
    });

    // Build pipeline input
    const pipelineInput = {
      runId,
      podcastId,
      configVersion: config.version || 1,
      config,
      flags: flags || {
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
      },
    };

    // Execute pipeline
    const orchestrator = new PipelineOrchestrator();
    const result = await orchestrator.execute(pipelineInput, emitter);

    // Update run to completed with all artifacts
    const now = new Date().toISOString();
    const audioS3Key = result.artifacts?.mp3S3Key;
    
    // Construct audioPath correctly - mp3S3Key is like "runs/{runId}/audio.mp3"
    let audioPath: string | undefined;
    if (audioS3Key) {
      // audioS3Key is already in format "runs/{runId}/audio.mp3", so use it directly
      audioPath = `/api/serve-file/${audioS3Key}`;
    }
    
    logger.info('Updating run to completed', { 
      runId, 
      hasAudioS3Key: !!audioS3Key,
      audioS3Key,
      audioPath,
      hasArtifacts: !!result.artifacts,
    });
    
    // Generate episode ID (use runId as episodeId)
    const episodeId = runId;
    
    await updateRunStatus(runId, {
      status: 'completed',
      currentStage: 'package',
      stageStatus: 'completed',
      stageCompletedAt: now,
      // Store audio URL and other artifacts for frontend
      output: {
        episodeId: episodeId,
        episodeTitle: result.episode?.title || `Episode ${now}`,
        audioS3Key: audioS3Key,
        audioPath: audioPath,
        showNotesPath: result.artifacts?.showNotesPath,
        transcriptVttPath: result.artifacts?.transcriptVttPath,
        transcriptTxtPath: result.artifacts?.transcriptTxtPath,
        sourcesJsonPath: result.artifacts?.sourcesJsonPath,
      },
      finishedAt: now,
    });
    
    logger.info('Run status updated to completed', { runId, audioPath, episodeId });
    
    // Create episode record in episodes table
    try {
      await createEpisodeRecord({
        episodeId,
        podcastId,
        runId,
        title: result.episode?.title || `Episode ${now}`,
        description: result.episode?.description || '',
        pubDate: now,
        durationSeconds: result.artifacts?.durationSeconds || 0,
        mp3S3Key: audioS3Key || '',
        transcriptS3Key: result.artifacts?.transcriptTxtPath || '',
        showNotesS3Key: result.artifacts?.showNotesPath || '',
        sourcesS3Key: result.artifacts?.sourcesJsonPath || '',
      });
      logger.info('Episode record created', { episodeId, podcastId });
    } catch (episodeError: any) {
      // Don't fail the run if episode creation fails - log and continue
      logger.error('Failed to create episode record', { 
        episodeId, 
        podcastId, 
        error: episodeError.message 
      });
    }

    logger.info('Pipeline orchestrator completed', { runId, podcastId });

    // Return result in format Step Functions expects
    return {
      success: true,
      runId,
      podcastId,
      result,
    };
  } catch (error: any) {
    logger.error('Pipeline orchestrator failed', { error, runId: event.runId || event.Payload?.runId });
    
    // Update run to failed
    const runId = event.runId || event.Payload?.runId;
    if (runId) {
      await updateRunStatus(runId, {
        status: 'failed',
        error: error.message || 'Pipeline execution failed',
      });
    }

    // Throw error so Step Functions can catch it
    throw error;
  }
};

