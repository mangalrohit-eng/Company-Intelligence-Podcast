/**
 * /api/podcasts/:id/runs - Manage podcast runs
 * GET - List all runs for a podcast
 * POST - Start a new podcast run
 */

import { NextRequest, NextResponse } from 'next/server';
import { runsStore } from '@/lib/runs-store';

// Execute pipeline orchestrator
async function executePipeline(runId: string, podcastId: string, run: any) {
  console.log(`⚙️ Executing pipeline orchestrator for run ${runId}...`);
  
  try {
    // Import the orchestrator (server-side only)
    const { PipelineOrchestrator } = await import('@/engine/orchestrator');
    const { NoOpEventEmitter } = await import('@/utils/event-emitter');
    
    const emitter = new NoOpEventEmitter();
    
    // TODO: Fetch podcast config from DynamoDB
    // For now, use minimal test config
    const pipelineInput = {
      runId,
      podcastId,
      config: {
        companyName: 'Test Company',
        durationMinutes: 5,
        timeWindow: {
          startIso: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endIso: new Date().toISOString(),
        },
        voice: 'alloy',
        speed: 1.0,
      },
      flags: {
        enable: {
          discover: true,
          scrape: true,
          extract: true,
          summarize: true,
          outline: true,
          script: true,
          tts: true,
          publish: false, // Skip publishing for now
        },
        provider: {
          llm: 'openai',
          tts: 'openai',
          http: 'real',
        },
        dryRun: false,
      },
    };
    
    // Update run status
    run.status = 'running';
    run.progress.currentStage = 'prepare';
    
    const orchestrator = new PipelineOrchestrator();
    const output = await orchestrator.execute(pipelineInput, emitter);
    
    // Mark as completed
    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    run.duration = Math.floor((new Date().getTime() - new Date(run.startedAt).getTime()) / 1000);
    run.progress.currentStage = 'completed';
    run.output = {
      episodeTitle: output.episode?.title || 'Generated Episode',
      audioS3Key: output.audioS3Key,
      transcript: output.script,
    };
    
    // Mark all stages as completed
    Object.keys(run.progress.stages).forEach(stage => {
      run.progress.stages[stage].status = 'completed';
    });
    
    console.log(`✅ Pipeline completed successfully for run ${runId}`);
  } catch (error: any) {
    console.error(`❌ Pipeline failed for run ${runId}:`, error);
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

    console.log(`📋 Fetching runs for podcast: ${podcastId}`);
    console.log(`📊 Runs store:`, runsStore);

    // Get runs for this podcast from in-memory store
    const runs = runsStore[podcastId] || [];
    
    console.log(`✅ Found ${runs.length} runs for podcast ${podcastId}`);
    
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

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
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
          scrape: { status: 'pending' },
          extract: { status: 'pending' },
          summarize: { status: 'pending' },
          outline: { status: 'pending' },
          script: { status: 'pending' },
          tts: { status: 'pending' },
          publish: { status: 'pending' },
        }
      }
    };
    
    console.log(`🚀 Starting REAL pipeline for podcast ${podcastId}: ${runId}`);
    
    // Store the run
    if (!runsStore[podcastId]) {
      runsStore[podcastId] = [];
    }
    runsStore[podcastId].push(run);
    
    // Execute the REAL pipeline in the background
    executePipeline(runId, podcastId, run).catch(error => {
      console.error(`❌ Pipeline execution failed for ${runId}:`, error);
      const storedRun = runsStore[podcastId]?.find(r => r.id === runId);
      if (storedRun) {
        storedRun.status = 'failed';
        storedRun.error = error.message;
        storedRun.completedAt = new Date().toISOString();
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


