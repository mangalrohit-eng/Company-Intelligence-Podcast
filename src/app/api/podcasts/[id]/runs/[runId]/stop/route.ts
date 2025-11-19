/**
 * API Route: Stop/Cancel a Running Pipeline
 * POST /api/podcasts/[id]/runs/[runId]/stop - Stop a running pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { runsStore } from '@/lib/runs-store';
import { saveRun, getRunsForPodcast } from '@/lib/runs-persistence';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const { id: podcastId, runId } = params;

    console.log(`🛑 Stop request for run ${runId} (podcast ${podcastId})`);

    // Find the run in memory store
    const memoryRuns = runsStore[podcastId] || [];
    let run = memoryRuns.find(r => r.id === runId);

    // If not in memory, try to load from persistence
    if (!run) {
      const persistedRuns = await getRunsForPodcast(podcastId);
      run = persistedRuns.find(r => r.id === runId);
    }

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Check if run is actually running
    if (run.status !== 'running') {
      return NextResponse.json({ 
        error: `Run is not running (current status: ${run.status})`,
        currentStatus: run.status,
      }, { status: 400 });
    }

    // Update run status to failed with cancellation message
    run.status = 'failed';
    run.completedAt = new Date().toISOString();
    run.output = {
      ...run.output,
      error: 'Pipeline stopped by user',
    };

    // Mark all running stages as failed (in case multiple stages were in progress)
    const stageOrder = ['prepare', 'discover', 'disambiguate', 'rank', 'scrape', 'extract', 'summarize', 'contrast', 'outline', 'script', 'qa', 'tts', 'package'];
    const currentStageIndex = run.progress.currentStage ? stageOrder.indexOf(run.progress.currentStage) : -1;
    
    // Mark all stages from current onwards as failed
    if (currentStageIndex >= 0) {
      for (let i = currentStageIndex; i < stageOrder.length; i++) {
        const stageId = stageOrder[i];
        if (run.progress.stages[stageId]) {
          // Mark as failed if it was running or pending
          if (run.progress.stages[stageId].status === 'running' || run.progress.stages[stageId].status === 'pending') {
            run.progress.stages[stageId].status = 'failed';
            run.progress.stages[stageId].completedAt = new Date().toISOString();
          }
        }
      }
    }
    
    // Clear current stage to stop UI from showing it as running
    run.progress.currentStage = '';

    // Update in memory store
    const runIndex = memoryRuns.findIndex(r => r.id === runId);
    if (runIndex >= 0) {
      memoryRuns[runIndex] = run;
    } else {
      memoryRuns.push(run);
    }
    runsStore[podcastId] = memoryRuns;

    // Persist to disk
    await saveRun(run);
    console.log(`✅ Run ${runId} stopped and saved`);

    // Create a stop flag file that the orchestrator can check
    const stopFlagPath = join(process.cwd(), 'output', 'episodes', runId, 'stop.flag');
    try {
      await writeFile(stopFlagPath, JSON.stringify({ 
        stopped: true, 
        stoppedAt: new Date().toISOString(),
        stoppedBy: 'user',
      }), 'utf-8');
      console.log(`🚩 Stop flag created at ${stopFlagPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not create stop flag file: ${error}`);
      // Continue anyway - the run status is already updated
    }

    return NextResponse.json({
      success: true,
      message: 'Pipeline stopped successfully',
      run: {
        id: run.id,
        status: run.status,
        completedAt: run.completedAt,
      },
    });
  } catch (error: any) {
    console.error('Failed to stop run:', error);
    return NextResponse.json(
      { error: 'Failed to stop pipeline', details: error.message },
      { status: 500 }
    );
  }
}
