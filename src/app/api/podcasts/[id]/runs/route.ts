/**
 * /api/podcasts/:id/runs - Manage podcast runs
 * GET - List all runs for a podcast
 * POST - Start a new podcast run
 */

import 'dotenv/config'; // Load .env file explicitly
import { NextRequest, NextResponse } from 'next/server';
import { runsStore } from '@/lib/runs-store';
import { saveRun, getRunsForPodcast } from '@/lib/runs-persistence';

// Helper to map topic IDs to full topic objects
function mapTopicsToStandard(topicIds: string[] = [], topicPriorities: Record<string, number> = {}) {
  const topicMap: Record<string, { name: string; priority: number }> = {
    'company-news': { name: 'Company News & Announcements', priority: 3 },
    'competitor-analysis': { name: 'Competitive Intelligence', priority: 2 },
    'industry-trends': { name: 'Industry Trends & Market Analysis', priority: 2 },
    'earnings': { name: 'Earnings & Financial Results', priority: 3 },
    'product-launches': { name: 'Product Launches', priority: 3 },
    'technology': { name: 'Technology & Innovation', priority: 2 },
    'partnerships': { name: 'Strategic Partnerships', priority: 2 },
    'leadership': { name: 'Leadership & Executive Changes', priority: 1 },
    'mergers-acquisitions': { name: 'Mergers & Acquisitions', priority: 3 },
    'm-and-a': { name: 'Mergers & Acquisitions', priority: 3 }, // Alias for M&A
    'strategy': { name: 'Strategy & Business Development', priority: 2 },
    'regulatory': { name: 'Regulatory & Legal Developments', priority: 2 },
  };
  
  return topicIds.map(id => {
    // Normalize topic ID (handle variations)
    const normalizedId = id.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and').replace(/[^a-z0-9-]/g, '');
    const topicKey = topicMap[normalizedId] ? normalizedId : (topicMap[id] ? id : normalizedId);
    
    return {
      id: topicKey,
      name: topicMap[topicKey]?.name || id,
      priority: topicPriorities[id] || topicPriorities[topicKey] || topicMap[topicKey]?.priority || 2,
    };
  });
}

// Execute pipeline orchestrator
async function executePipeline(runId: string, podcastId: string, run: any, podcast: any = null) {
  console.log(`⚙️ [${runId}] Starting pipeline execution...`);
  
  try {
    // Import the orchestrator (server-side only)
    console.log(`⚙️ [${runId}] Importing modules...`);
    const { PipelineOrchestrator } = await import('@/engine/orchestrator');
    const { RealtimeEventEmitter } = await import('@/utils/realtime-event-emitter');
    console.log(`✅ [${runId}] Modules imported`);
    
    // Create emitter with real-time callback that updates run status
    const emitter = new RealtimeEventEmitter((update) => {
      // Update the run in runsStore in real-time
      if (update.currentStage) {
        run.progress.currentStage = update.currentStage;
        
        // Ensure the stage exists in the stages object (defensive)
        if (!run.progress.stages[update.currentStage]) {
          run.progress.stages[update.currentStage] = { status: 'pending' };
          console.warn(`⚠️ [${runId}] Stage '${update.currentStage}' was not in initial stages object, adding it now`);
        }
      }
      
      const currentStage = run.progress.currentStage;
      
      if (update.stageStatus && currentStage && run.progress.stages[currentStage]) {
        run.progress.stages[currentStage].status = update.stageStatus;
      }
      
      if (update.stageStartedAt && currentStage && run.progress.stages[currentStage]) {
        run.progress.stages[currentStage].startedAt = update.stageStartedAt;
      }
      
      if (update.stageCompletedAt && currentStage && run.progress.stages[currentStage]) {
        run.progress.stages[currentStage].completedAt = update.stageCompletedAt;
      }
      
      if (update.error) {
        run.error = update.error;
        run.status = 'failed';
        if (currentStage && run.progress.stages[currentStage]) {
          run.progress.stages[currentStage].status = 'failed';
          run.progress.stages[currentStage].error = update.error;
        }
      }
      
      // Save run to DynamoDB after each update (async, fire-and-forget, with timeout)
      // Use a timeout to prevent hanging if DynamoDB is slow
      Promise.race([
        saveRun(run),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Save timeout')), 5000)
        )
      ]).catch(err => {
        // Log errors but don't block - DynamoDB saves are best-effort
        if (err.message !== 'Save timeout') {
          // Only log actual errors, not timeouts (too verbose)
          console.error(`❌ [${runId}] Failed to persist run:`, err.message);
        }
        // Timeouts are expected and don't need logging
      });
    });
    console.log(`✅ [${runId}] Emitter created`);
    
    // Use actual podcast config if available, otherwise fallback to defaults
    const companyId = podcast?.companyId || 'Microsoft';
    const title = podcast?.title || 'Test Podcast';
    const duration = podcast?.config?.duration || 5;
    const voice = podcast?.config?.voice || 'alloy';
    const schedule = podcast?.config?.schedule || 'daily';
    
    // Topics can be stored in multiple places - check all possibilities
    let topicIds: string[] = [];
    console.log(`🔍 [${runId}] Searching for topics in podcast object...`, {
      hasPodcast: !!podcast,
      podcastKeys: podcast ? Object.keys(podcast) : [],
      podcastTopics: podcast?.topics,
      podcastTopicIds: podcast?.topicIds,
      podcastConfigTopics: podcast?.config?.topics,
    });
    
    if (podcast?.topics && Array.isArray(podcast.topics) && podcast.topics.length > 0) {
      topicIds = podcast.topics;
      console.log(`✅ [${runId}] Found topics in podcast.topics:`, topicIds);
    } else if (podcast?.topicIds && Array.isArray(podcast.topicIds) && podcast.topicIds.length > 0) {
      topicIds = podcast.topicIds;
      console.log(`✅ [${runId}] Found topics in podcast.topicIds:`, topicIds);
    } else if (podcast?.config?.topics && Array.isArray(podcast.config.topics) && podcast.config.topics.length > 0) {
      topicIds = podcast.config.topics;
      console.log(`✅ [${runId}] Found topics in podcast.config.topics:`, topicIds);
    } else {
      // Fallback to defaults if no topics found
      topicIds = ['company-news', 'competitor-analysis', 'industry-trends'];
      console.warn(`⚠️ [${runId}] No topics found in podcast config, using defaults:`, topicIds);
      console.warn(`⚠️ [${runId}] Full podcast object:`, JSON.stringify(podcast, null, 2));
      console.warn(`⚠️ [${runId}] This means either:`);
      console.warn(`   1. Podcast was not saved with topics`);
      console.warn(`   2. DynamoDB is not available and podcast not in memory`);
      console.warn(`   3. Topics array was empty when podcast was created`);
    }
    
    const topicPriorities = podcast?.topicPriorities || podcast?.config?.topicPriorities || {};
    const competitors = podcast?.competitors || podcast?.competitorIds || [];
    
    // Determine provider mode
    const openaiKey = process.env.OPENAI_API_KEY;
    const hasOpenAIKey = !!openaiKey;
    const llmProvider = hasOpenAIKey ? 'openai' : 'replay';
    const ttsProvider = hasOpenAIKey ? 'openai' : 'stub';
    
    // Debug: Log environment variable status
    console.log(`🔑 OpenAI API Key Check:`, {
      hasKey: hasOpenAIKey,
      keyLength: openaiKey ? openaiKey.length : 0,
      keyPrefix: openaiKey ? openaiKey.substring(0, 7) + '...' : 'none',
      envVars: Object.keys(process.env).filter(k => k.includes('OPENAI')),
    });
    
    console.log(`📋 Pipeline Config:`, {
      company: companyId,
      topics: topicIds,
      topicCount: topicIds.length,
      topicPriorities,
      duration,
      voice,
      llmProvider: `${llmProvider}${hasOpenAIKey ? '' : ' (no API key, using replay mode)'}`,
      ttsProvider: `${ttsProvider}${hasOpenAIKey ? '' : ' (no API key, using stub)'}`,
      podcastKeys: podcast ? Object.keys(podcast) : 'null',
    });
    
    const pipelineInput = {
      runId,
      podcastId,
      configVersion: 1,
      config: {
        // Metadata
        title,
        subtitle: podcast?.subtitle || `Company Intelligence Updates for ${companyId}`,
        description: podcast?.description || `AI-powered intelligence briefing for ${companyId}`,
        author: podcast?.author || companyId,
        email: podcast?.email || 'podcast@example.com',
        category: podcast?.category || 'Business',
        explicit: podcast?.explicit || false,
        language: podcast?.language || 'en',
        coverArtS3Key: podcast?.coverArtS3Key || 'default-cover.png',
        
        // Core Config
        company: {
          id: companyId.toLowerCase().replace(/\s+/g, '-'),
          name: companyId,
        },
        industry: {
          id: podcast?.industryId || 'technology',
          name: podcast?.industryId || 'Technology',
        },
        competitors: competitors.map((c: any) => 
          typeof c === 'string' 
            ? { id: c.toLowerCase(), name: c, isAiSuggested: false } 
            : { id: c.id || c, name: c.name || c, isAiSuggested: c.isAiSuggested || false }
        ),
        
        // Topics - Map from stored IDs to full topic objects
        // Ensure we have at least some topics (fallback to defaults if empty)
        topics: {
          standard: topicIds.length > 0 
            ? mapTopicsToStandard(topicIds, topicPriorities)
            : mapTopicsToStandard(['company-news', 'competitor-analysis', 'industry-trends'], {}),
          special: [],
        },
        
        // Cadence & Timing
        cadence: (schedule as any) || 'daily' as const,
        durationMinutes: duration,
        publishTime: podcast?.publishTime || '09:00',
        timezone: podcast?.timezone || 'UTC',
        timeWindowHours: schedule === 'daily' ? 24 : schedule === 'weekly' ? 168 : 720,
        
        // Time window for news discovery (computed from timeWindowHours)
        timeWindow: {
          startIso: new Date(Date.now() - (schedule === 'daily' ? 24 : schedule === 'weekly' ? 168 : 720) * 60 * 60 * 1000).toISOString(),
          endIso: new Date().toISOString(),
        },
        
        // Geographic & Language
        regions: podcast?.regions || ['US'],
        sourceLanguages: podcast?.sourceLanguages || ['en'],
        
        // Voice & Tone
        voice: {
          provider: 'openai-tts' as const,
          voiceId: voice,
          speed: podcast?.voiceSpeed || 1.0,
          tone: podcast?.voiceTone || 'professional',
        },
        
        // Compliance & Policies
        robotsMode: 'permissive' as const,
        sourcePolicies: {
          allowDomains: [],
          blockDomains: [],
        },
      },
      flags: {
        dryRun: false,
        provider: {
          // Use OpenAI if API key is available, otherwise use replay mode (free, works offline)
          llm: llmProvider as const,
          tts: ttsProvider as const,
          http: 'stub' as const,  // Use Playwright for JavaScript-enabled scraping
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
    
    // Update run status
    run.status = 'running';
    run.progress.currentStage = 'prepare';
    
    console.log(`⚙️ [${runId}] Creating orchestrator instance...`);
    const orchestrator = new PipelineOrchestrator();
    console.log(`✅ [${runId}] Orchestrator created, starting execution...`);
    const output = await orchestrator.execute(pipelineInput, emitter);
    console.log(`✅ [${runId}] Pipeline execution returned`);
    
    console.log(`📊 Pipeline output:`, {
      status: output.status,
      episodeId: output.episodeId,
      hasArtifacts: !!output.artifacts,
      error: output.error,
      errorDetails: output.error ? JSON.stringify(output.error) : 'none',
    });
    
    // Mark as completed or failed
    run.status = output.status === 'success' ? 'completed' : 'failed';
    run.completedAt = new Date().toISOString();
    run.duration = Math.floor((new Date().getTime() - new Date(run.startedAt).getTime()) / 1000);
    run.progress.currentStage = output.status === 'success' ? 'completed' : 'failed';
    
    if (output.status === 'success') {
      // Generate audio URL - use S3 if available, otherwise use serve-file endpoint
      const hasS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
      const audioPath = output.artifacts?.mp3S3Key
        ? (hasS3 && process.env.S3_BUCKET_MEDIA
            ? `https://${process.env.S3_BUCKET_MEDIA}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${output.artifacts.mp3S3Key}`
            : `/api/serve-file/episodes/${runId}/audio.mp3`)
        : undefined;
      
      run.output = {
        episodeId: output.episodeId,
        episodeTitle: output.episode?.title || 'Generated Episode',
        audioS3Key: output.artifacts?.mp3S3Key,
        audioPath: audioPath,
        transcriptS3Key: output.artifacts?.transcriptS3Key,
        showNotesS3Key: output.artifacts?.showNotesS3Key,
      };
      
      // Mark all stages as completed
      Object.keys(run.progress.stages).forEach(stage => {
        run.progress.stages[stage].status = 'completed';
      });
      
      // Persist completed run to DynamoDB (don't let save errors mark run as failed)
      try {
        await saveRun(run);
        console.log(`✅ Pipeline completed successfully for run ${runId}`);
      } catch (saveError: any) {
        // Log but don't fail - the pipeline succeeded, just couldn't save status
        console.error(`⚠️ [${runId}] Pipeline succeeded but failed to save status:`, saveError.message);
        console.log(`✅ Pipeline completed successfully for run ${runId} (status save failed but run succeeded)`);
      }
    } else {
      // Pipeline failed
      run.error = output.error || 'Unknown error';
      run.output = {
        error: output.error,
        errorMessage: typeof output.error === 'string' ? output.error : JSON.stringify(output.error),
      };
      
      // Persist failed run to DynamoDB
      try {
        await saveRun(run);
        console.error(`❌ Pipeline failed for run ${runId}:`, output.error);
      } catch (saveError: any) {
        console.error(`⚠️ [${runId}] Pipeline failed and also failed to save status:`, saveError.message);
      }
    }
  } catch (error: any) {
    console.error(`❌ [${runId}] Pipeline exception:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error,
    });
    
    // Only mark as failed if the pipeline itself failed, not if saveRun() failed
    // Check if this is a saveRun error by checking if run.status was already set to completed
    if (run.status !== 'completed') {
      run.status = 'failed';
      run.error = error.message || 'Unknown error';
      run.completedAt = new Date().toISOString();
      
      // Persist exception-failed run to DynamoDB
      try {
        await saveRun(run);
      } catch (saveError: any) {
        console.error(`⚠️ [${runId}] Failed to save failed run status:`, saveError.message);
      }
    } else {
      // Pipeline completed but saveRun() failed - log but don't change status
      console.error(`⚠️ [${runId}] Pipeline completed but saveRun() failed:`, error.message);
    }
    
    // Re-throw only if it's a pipeline error, not a saveRun error
    if (!error.message?.includes('save run to DynamoDB') && !error.message?.includes('AWS credentials required')) {
      throw error;
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const podcastId = params.id;
    
    if (!podcastId) {
      return NextResponse.json(
        { error: 'Missing podcast ID' },
        { status: 400 }
      );
    }

    // Load runs from persistent storage (DynamoDB)
    const runs = await getRunsForPodcast(podcastId);
    
    // Also merge in-memory runs (in case of recent updates not yet persisted)
    // Note: On Vercel, in-memory runs only exist during the same function invocation
    const memoryRuns = runsStore[podcastId] || [];
    
    // Merge memory runs with persisted runs (memory takes precedence for same ID)
    for (const memRun of memoryRuns) {
      const existingIndex = runs.findIndex(r => r.id === memRun.id);
      if (existingIndex >= 0) {
        // Update existing run with latest from memory
        runs[existingIndex] = memRun;
      } else {
        // Add new run from memory
        runs.push(memRun);
      }
    }
    
    // Sort by createdAt descending (newest first)
    runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      runs,
      total: runs.length,
    });
  } catch (error) {
    console.error('Error fetching runs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch runs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const podcastId = params.id;
    
    if (!podcastId) {
      return NextResponse.json(
        { error: 'Missing podcast ID' },
        { status: 400 }
      );
    }

    // Fetch the actual podcast config from DynamoDB
    console.log(`📡 Fetching podcast config for: ${podcastId}`);
    let podcast: any = null;
    try {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb');
      
      // AWS SDK will automatically use credentials from environment or AWS CLI config
      const client = new DynamoDBClient({ 
        region: process.env.AWS_REGION || 'us-east-1',
      });
      const docClient = DynamoDBDocumentClient.from(client);
      
      console.log(`🔗 DynamoDB client initialized for region: ${process.env.AWS_REGION || 'us-east-1'}`);
      
      const response = await docClient.send(
        new GetCommand({
          TableName: 'podcasts',
          Key: { id: podcastId },
        })
      );
      
      podcast = response.Item;
      console.log(`✅ Fetched podcast config from DynamoDB:`, {
        id: podcast?.id,
        title: podcast?.title,
        hasTopics: !!podcast?.topics,
        topics: podcast?.topics,
        topicsLength: podcast?.topics?.length || 0,
        hasTopicIds: !!podcast?.topicIds,
        topicIds: podcast?.topicIds,
        topicPriorities: podcast?.topicPriorities,
        allKeys: podcast ? Object.keys(podcast) : [],
      });
    } catch (error: any) {
      console.warn(`⚠️ Could not fetch from DynamoDB (local dev mode):`, error.message);
      
      // Fallback: Try to fetch from GET /api/podcasts endpoint (might have it in memory)
      try {
        console.log(`🔄 Trying fallback: fetching from GET /api/podcasts endpoint...`);
        const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
        const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
        
        const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        const docClient = DynamoDBDocumentClient.from(client);
        
        const scanResponse = await docClient.send(
          new ScanCommand({
            TableName: 'podcasts',
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: { ':id': podcastId },
            Limit: 1,
          })
        );
        
        if (scanResponse.Items && scanResponse.Items.length > 0) {
          podcast = scanResponse.Items[0];
          console.log(`✅ Found podcast via scan fallback:`, {
            id: podcast?.id,
            topics: podcast?.topics,
            topicsLength: podcast?.topics?.length || 0,
          });
        }
      } catch (fallbackError: any) {
        console.warn(`⚠️ Fallback fetch also failed:`, fallbackError.message);
      }
      
      // If still no podcast, log a warning but continue (will use defaults)
      if (!podcast) {
        console.warn(`⚠️ No podcast found for ${podcastId}. Will use default topics.`);
        console.warn(`⚠️ This usually means DynamoDB is not configured or the podcast was not saved.`);
      }
    }

    // Generate consistent run ID: timestamp + 6 random characters (fixed length)
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    
    const run = {
      id: runId,
      podcastId,
      status: 'running',
      startedAt: now,
      createdAt: now,
      progress: {
        currentStage: 'preparing',
        stages: {
          prepare: { status: 'running', startedAt: now },
          discover: { status: 'pending' },
          disambiguate: { status: 'pending' },
          rank: { status: 'pending' },
          scrape: { status: 'pending' },
          extract: { status: 'pending' },
          summarize: { status: 'pending' },
          contrast: { status: 'pending' },
          outline: { status: 'pending' },
          script: { status: 'pending' },
          qa: { status: 'pending' },
          tts: { status: 'pending' },
          package: { status: 'pending' },
        }
      }
    };
    
    console.log(`🚀 Starting REAL pipeline for podcast ${podcastId}: ${runId}`);
    
    // Store the run in memory
    if (!runsStore[podcastId]) {
      runsStore[podcastId] = [];
    }
    runsStore[podcastId].push(run);
    
    // Persist to DynamoDB immediately
    await saveRun(run);
    
    // Execute the REAL pipeline in the background
    executePipeline(runId, podcastId, run, podcast).catch(error => {
      console.error(`❌ Pipeline execution failed for ${runId}:`, error);
      const storedRun = runsStore[podcastId]?.find(r => r.id === runId);
      if (storedRun) {
        storedRun.status = 'failed';
        storedRun.error = error.message;
        storedRun.completedAt = new Date().toISOString();
        // Persist failed status to disk
        saveRun(storedRun).catch(err => console.error(`❌ Failed to persist failed run:`, err));
      }
    });

    return NextResponse.json({
      runId,
      podcastId,
      status: 'started',
      message: 'Pipeline run started successfully',
      createdAt: now,
    });
  } catch (error) {
    console.error('Error creating run:', error);
    return NextResponse.json(
      {
        error: 'Failed to create run',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


