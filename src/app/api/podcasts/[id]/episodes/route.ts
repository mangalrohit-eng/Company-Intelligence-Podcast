/**
 * GET /api/podcasts/[id]/episodes - List episodes for a podcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRunsForPodcast } from '@/lib/runs-persistence';

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

    console.log(`📋 Fetching episodes for podcast: ${podcastId}`);

    // Get all runs for this podcast
    const runs = await getRunsForPodcast(podcastId);

    // Filter to completed runs that have episodes
    const completedRuns = runs.filter(
      (run: any) =>
        run.status === 'completed' &&
        run.output?.episodeId &&
        run.output?.audioS3Key
    );

    // Transform runs into episodes
    const episodes = completedRuns.map((run: any) => {
      // Determine audio URL based on environment
      let audioUrl = '';
      if (run.output.audioS3Key) {
        // For local dev, use serve-file endpoint
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
          audioUrl = `/api/serve-file/episodes/${run.id}/${run.id}.mp3`;
        } else {
          // For production, use S3 presigned URL or CloudFront
          audioUrl = run.output.audioS3Key;
        }
      }

      return {
        id: run.output.episodeId || run.id,
        podcastId: podcastId,
        runId: run.id,
        title: run.output.episodeTitle || `Episode from ${new Date(run.startedAt).toLocaleDateString()}`,
        description: run.output.episodeDescription || '',
        pubDate: run.completedAt || run.startedAt,
        durationSeconds: run.output.durationSeconds || 0,
        audioUrl: audioUrl,
        transcriptUrl: run.output.transcriptS3Key
          ? `/api/serve-file/episodes/${run.id}/${run.id}_transcript.txt`
          : null,
        showNotesUrl: run.output.showNotesS3Key
          ? `/api/serve-file/episodes/${run.id}/${run.id}_show_notes.md`
          : null,
        episodeNumber: completedRuns.length - completedRuns.indexOf(run),
        createdAt: run.startedAt,
        updatedAt: run.completedAt || run.startedAt,
      };
    });

    // Sort by date (newest first)
    episodes.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    console.log(`✅ Found ${episodes.length} episodes for podcast ${podcastId}`);

    return NextResponse.json({
      episodes,
      count: episodes.length,
    });
  } catch (error: any) {
    console.error('Error fetching episodes:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch episodes',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

