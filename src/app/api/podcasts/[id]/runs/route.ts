/**
 * /api/podcasts/:id/runs - Manage podcast runs
 * GET - List all runs for a podcast
 * POST - Start a new podcast run
 */

import { NextRequest, NextResponse } from 'next/server';
import { runsStore } from '@/lib/runs-store';
import { saveRun, getRunsForPodcast, PersistedRun, loadRuns } from '@/lib/runs-persistence';
import { logger } from '@/utils/logger';

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
    'regulatory': { name: 'Regulatory & Legal Developments', priority: 2 },
  };
  
  return topicIds.map(id => ({
    id,
    name: topicMap[id]?.name || id,
    priority: topicPriorities[id] || topicMap[id]?.priority || 2,
  }));
}

// Execute pipeline orchestrator
async function executePipeline(
  runId: string, 
  podcastId: string, 
  run: PersistedRun, 
  podcast: any = null,
  fetchedTopics: any[] = [],
  fetchedCompetitors: any[] = []
) {
  // Reduced logging for performance
  try {
    // Import the orchestrator (server-side only)
    const { PipelineOrchestrator } = await import('@/engine/orchestrator');
    const { RealtimeEventEmitter } = await import('@/utils/realtime-event-emitter');
    
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
      
      // Reduced logging - only log errors or stage changes
      if (update.error || (update.currentStage && update.currentStage !== run.progress.currentStage)) {
        console.log(`[${runId}] ${update.currentStage || run.progress.currentStage}: ${update.error || 'progress'}`);
      }
      
      // Save run to disk after each update (async, fire-and-forget)
      saveRun(run).catch(err => console.error(`[${runId}] Failed to persist run:`, err));
    });
    
    // Use actual podcast config if available, otherwise fallback to defaults
    const companyId = podcast?.companyId || 'Microsoft';
    const title = podcast?.title || 'Test Podcast';
    const duration = podcast?.config?.duration || 5;
    const voice = podcast?.config?.voice || 'alloy';
    const schedule = podcast?.config?.schedule || 'daily';
    
    // Extract topic IDs and priorities from fetched topics (passed as parameter or fallback)
    const topicsToUse = fetchedTopics.length > 0 ? fetchedTopics : [];
    const topicIds = topicsToUse.length > 0 
      ? topicsToUse.map((t: any) => t.topicName || t.topicId)
      : ['company-news', 'competitor-analysis', 'industry-trends'];
    const topicPriorities = topicsToUse.reduce((acc: Record<string, number>, t: any) => {
      const topicName = t.topicName || t.topicId;
      acc[topicName] = t.priorityWeight || 50;
      return acc;
    }, {});
    
    // Extract competitor names from fetched competitors (passed as parameter or fallback)
    const competitorsToUse = fetchedCompetitors.length > 0 ? fetchedCompetitors : [];
    const competitorNames = competitorsToUse.length > 0
      ? competitorsToUse.map((c: any) => c.companyName || c.companyId)
      : [];
    
    // Pipeline config logged only in debug mode
    
    const pipelineInput = {
      runId,
      podcastId,
      configVersion: 1,
      config: {
        // Metadata
        title,
        subtitle: podcast?.subtitle || `Company Intelligence Updates for ${companyId}`,
        description: podcast?.description || `AI-powered intelligence briefing for ${companyId}`,
        author: podcast?.author || podcast?.config?.author || companyId,
        email: podcast?.email || podcast?.config?.email || 'noreply@podcast-platform.com',
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
        competitors: competitorNames.map((c: any) => {
          const competitorName = typeof c === 'string' ? c : (c.companyName || c.name || c);
          const competitorItem = typeof c === 'string' ? null : c;
          return {
            id: competitorName.toLowerCase().replace(/\s+/g, '-'),
            name: competitorName,
            isAiSuggested: competitorItem?.isAiSuggested || false
          };
        }),
        
        // Topics - Map from stored IDs to full topic objects
        topics: {
          standard: mapTopicsToStandard(topicIds, topicPriorities),
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
          llm: 'openai' as const,
          tts: 'openai' as const,
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
    
    const orchestrator = new PipelineOrchestrator();
    const output = await orchestrator.execute(pipelineInput, emitter);
    
    // Only log errors or completion
    if (output.status === 'failed') {
      console.error(`[${runId}] Pipeline failed:`, output.error);
    }
    
    // Mark as completed or failed
    run.status = output.status === 'success' ? 'completed' : 'failed';
    run.completedAt = new Date().toISOString();
    if (run.startedAt) {
      const startedAt = run.startedAt; // Type guard
      run.duration = Math.floor((new Date().getTime() - new Date(startedAt).getTime()) / 1000);
    }
    run.progress.currentStage = output.status === 'success' ? 'completed' : 'failed';
    
    if (output.status === 'success') {
      // Generate interesting episode title from script using LLM
      let episodeTitle = 'Generated Episode';
      try {
        const { generateEpisodeTitleFromFile } = await import('@/utils/episode-title-generator');
        const scriptPath = `output/episodes/${runId}/debug/script_output.json`;
        const openaiApiKey = process.env.OPENAI_API_KEY;
        episodeTitle = await generateEpisodeTitleFromFile(scriptPath, openaiApiKey);
        // Episode title generated (logged only in debug)
      } catch (error) {
        console.warn('Failed to generate episode title, using default:', error);
      }
      
      run.output = {
        episodeId: output.episodeId,
        episodeTitle,
        audioS3Key: output.artifacts?.mp3S3Key,
        transcriptS3Key: output.artifacts?.transcriptS3Key,
        showNotesS3Key: output.artifacts?.showNotesS3Key,
      };
      
      // Mark all stages as completed
      Object.keys(run.progress.stages).forEach(stage => {
        run.progress.stages[stage].status = 'completed';
      });
      
      // Persist completed run to disk
      await saveRun(run);
      console.log(`[${runId}] Pipeline completed`);
    } else {
      // Pipeline failed
      run.error = output.error || 'Unknown error';
      run.output = {
        error: output.error,
        errorMessage: typeof output.error === 'string' ? output.error : JSON.stringify(output.error),
      };
      
      // Persist failed run to disk
      await saveRun(run);
      console.error(`❌ Pipeline failed for run ${runId}:`, output.error);
    }
  } catch (error: any) {
    console.error(`❌ [${runId}] Pipeline exception:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error,
    });
    run.status = 'failed';
    run.error = error.message || 'Unknown error';
    run.completedAt = new Date().toISOString();
    
    // Persist exception-failed run to disk
    await saveRun(run);
    throw error;
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

    // Load runs from persistent storage (includes all runs - completed, failed, running)
    const runs = await getRunsForPodcast(podcastId);
    
    // Also merge in-memory runs (in case of recent updates not yet persisted)
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
    
    // Also check file system for completed runs with audio (LOCAL DEVELOPMENT ONLY)
    // In production, all runs should come from DynamoDB with proper S3 keys
    if (process.env.NODE_ENV !== 'production' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const outputDir = path.join(process.cwd(), 'output', 'episodes');
        
        // Load all runs to check if run exists for another podcast
        const { loadRuns } = await import('@/lib/runs-persistence');
        const allRuns = await loadRuns();
        
        const dirs = await fs.readdir(outputDir);
        
        for (const dir of dirs) {
          const dirPath = path.join(outputDir, dir);
          const stat = await fs.stat(dirPath);
          
          if (stat.isDirectory() && dir.startsWith('run_')) {
            // Check if this run already exists in database for ANY podcast
            let existingRunInDb: PersistedRun | null = null;
            let actualPodcastId: string | null = null;
            
            // Search all podcasts to find if this run exists
            for (const [pid, podcastRuns] of Object.entries(allRuns)) {
              const found = podcastRuns.find((r: PersistedRun) => r.id === dir);
              if (found) {
                existingRunInDb = found;
                actualPodcastId = pid;
                break;
              }
            }
            
            // ✅ CRITICAL: If run exists in DB for a DIFFERENT podcast, skip it
            // This prevents cross-contamination (e.g., Amazon run showing in JCFamilies)
            if (existingRunInDb && actualPodcastId !== podcastId) {
              logger.debug('Skipping run from file system - belongs to different podcast', {
                runId: dir,
                actualPodcastId,
                requestedPodcastId: podcastId,
              });
              continue;
            }
            
            // ✅ Only process runs that:
            // 1. Already exist in DB for THIS podcast, OR
            // 2. Don't exist in DB at all (orphaned file system runs - we'll skip these for safety)
            
            // Check if this run already exists in current podcast's runs
            const existingRun = runs.find(r => r.id === dir);
            
            // Check if audio file exists
            const audioPath = path.join(dirPath, 'audio.mp3');
            const hasAudio = await fs.access(audioPath).then(() => true).catch(() => false);
            
            if (hasAudio) {
              const audioStats = await fs.stat(audioPath);
              
              if (existingRun) {
                // Update existing run with audio info
                if (!existingRun.output) {
                  existingRun.output = {};
                }
                existingRun.output.audioPath = `/output/episodes/${dir}/audio.mp3`;
                existingRun.output.audioSize = audioStats.size;
                existingRun.status = 'completed';
              } else if (existingRunInDb && actualPodcastId === podcastId) {
                // Run exists in DB for this podcast, add it to results
                runs.push(existingRunInDb);
              } else {
                // Run doesn't exist in DB OR exists for different podcast
                // Skip it to prevent cross-contamination
                // In production, all runs should come from DynamoDB with proper podcastId
                logger.debug('Skipping run from file system - not in database for this podcast', {
                  runId: dir,
                  requestedPodcastId: podcastId,
                  existsInDb: !!existingRunInDb,
                  actualPodcastId: actualPodcastId || 'none',
                });
                continue;
              }
            }
          }
        }
      } catch (err) {
        // Silently ignore filesystem errors in local dev
        console.debug('File system check skipped (expected in production):', err);
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
    // Fetching podcast config (logged only in debug)
    let podcast: any = null;
    let topics: any[] = [];
    let competitors: any[] = [];
    
    try {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, GetCommand, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
      
      const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const docClient = DynamoDBDocumentClient.from(client);
      
      // Fetch main podcast record
      const podcastResponse = await docClient.send(
        new GetCommand({
          TableName: process.env.PODCASTS_TABLE || 'podcasts',
          Key: { id: podcastId },
        })
      );
      
      podcast = podcastResponse.Item;
      
      // Fetch topics from podcast_topics table
      try {
        const topicsResponse = await docClient.send(
          new QueryCommand({
            TableName: process.env.PODCAST_TOPICS_TABLE || 'podcast_topics',
            KeyConditionExpression: 'podcastId = :podcastId',
            ExpressionAttributeValues: {
              ':podcastId': podcastId,
            },
          })
        );
        
        topics = topicsResponse.Items || [];
      } catch (error: any) {
        console.warn(`⚠️ Could not fetch topics from DynamoDB:`, error.message);
      }
      
      // Fetch competitors from podcast_competitors table
      try {
        const competitorsResponse = await docClient.send(
          new QueryCommand({
            TableName: process.env.PODCAST_COMPETITORS_TABLE || 'podcast_competitors',
            KeyConditionExpression: 'podcastId = :podcastId',
            ExpressionAttributeValues: {
              ':podcastId': podcastId,
            },
          })
        );
        
        competitors = competitorsResponse.Items || [];
      } catch (error: any) {
        console.warn(`⚠️ Could not fetch competitors from DynamoDB:`, error.message);
      }
      
      // Podcast config fetched (logged only in debug)
    } catch (error: any) {
      console.warn(`⚠️ Could not fetch from DynamoDB (local dev mode):`, error.message);
      // For local dev, we'll use default config
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();
    
    const run: PersistedRun = {
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
    
    // Store the run in memory
    if (!runsStore[podcastId]) {
      runsStore[podcastId] = [];
    }
    runsStore[podcastId].push(run);
    
    // Also persist to disk immediately
    await saveRun(run);
    
    // Execute the REAL pipeline in the background with fetched topics and competitors
    executePipeline(runId, podcastId, run, podcast, topics, competitors).catch(error => {
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


