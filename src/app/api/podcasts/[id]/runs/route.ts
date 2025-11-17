/**
 * POST /api/podcasts/:id/runs - Start a new podcast run
 * This is a Next.js API route that proxies to the Lambda function
 */

import { NextRequest, NextResponse } from 'next/server';
import { runsStore } from '@/lib/runs-store';

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

    // For now, simulate a successful run creation
    // In production, this would call the actual Lambda function
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();
    
    const run = {
      id: runId,
      podcastId,
      status: 'running',
      startedAt: now,
      createdAt: now,
      progress: {
        currentStage: 'extract',
        stages: {
          extract: { status: 'running', startedAt: now },
          prepare: { status: 'pending' },
          outline: { status: 'pending' },
          script: { status: 'pending' },
          speak: { status: 'pending' },
          publish: { status: 'pending' },
        }
      }
    };
    
    console.log(`🚀 Creating run for podcast ${podcastId}: ${runId}`);
    
    // Store the run
    if (!runsStore[podcastId]) {
      runsStore[podcastId] = [];
    }
    runsStore[podcastId].push(run);
    
    // Simulate async processing - update status after a few seconds
    setTimeout(() => {
      const storedRun = runsStore[podcastId]?.find(r => r.id === runId);
      if (storedRun) {
        storedRun.status = 'completed';
        storedRun.completedAt = new Date().toISOString();
        storedRun.duration = 127; // ~2 minutes
        storedRun.progress.currentStage = 'completed';
        Object.keys(storedRun.progress.stages).forEach(stage => {
          storedRun.progress.stages[stage].status = 'completed';
        });
      }
    }, 5000);

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


