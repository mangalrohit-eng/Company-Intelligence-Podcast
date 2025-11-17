/**
 * GET /api/podcasts/:id/runs/list - Get all runs for a podcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { runsStore } from '@/lib/runs-store';

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

    // Get runs for this podcast from in-memory store
    const runs = runsStore[podcastId] || [];
    
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

