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
    console.log(`📊 Found ${runs.length} total runs for podcast ${podcastId}`);
    console.log(`📊 Run IDs:`, runs.map(r => ({ id: r.id, status: r.status, hasOutput: !!r.output, hasEpisodeId: !!r.output?.episodeId })));

    // For local dev, also check filesystem for completed runs with audio
    // This ensures runs that exist in the filesystem but might not be in the database are included
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const outputDir = path.join(process.cwd(), 'output', 'episodes');
      
      try {
        const dirs = await fs.readdir(outputDir);
        
        for (const dir of dirs) {
          const dirPath = path.join(outputDir, dir);
          const stat = await fs.stat(dirPath);
          
          if (stat.isDirectory() && dir.startsWith('run_')) {
            // Check if this run already exists in our runs list
            const existingRun = runs.find(r => {
              // Match exact ID (run IDs match directory names)
              return r.id === dir;
            });
            
            // Check if audio file exists (the file is named audio.mp3)
            const audioPath = path.join(dirPath, 'audio.mp3');
            const hasAudio = await fs.access(audioPath).then(() => true).catch(() => false);
            
            if (hasAudio && existingRun) {
              // Ensure run is marked as completed and has output
              if (!existingRun.output) {
                existingRun.output = {};
              }
              existingRun.status = 'completed';
              existingRun.output.episodeId = existingRun.output.episodeId || existingRun.id;
              if (!existingRun.output.audioS3Key && !existingRun.output.mp3S3Key) {
                // Set audioS3Key to match the actual file path structure
                existingRun.output.audioS3Key = `runs/${dir}/audio.mp3`;
              }
            }
            // Note: We don't add runs from filesystem that aren't in the database
            // because we can't determine which podcast they belong to without the database
          }
        }
      } catch (err) {
        console.log('📂 No output directory or error reading (local dev only):', err);
      }
    }

    // Filter to completed runs that have episodes
    const completedRuns = runs.filter((run: any) => {
      console.log(`🔍 Checking run ${run.id}:`, {
        status: run.status,
        hasOutput: !!run.output,
        outputKeys: run.output ? Object.keys(run.output) : [],
      });
      
      const isCompleted = run.status === 'completed' || run.status === 'success';
      
      if (!isCompleted) {
        console.log(`⏭️ Skipping run ${run.id}: status is ${run.status} (not completed)`);
        return false;
      }
      
      // Ensure output exists
      if (!run.output) {
        console.log(`⚠️ Run ${run.id} has no output, creating default output`);
        run.output = {
          episodeId: run.id,
        };
      }
      
      // Ensure episodeId exists (use run.id as fallback)
      if (!run.output.episodeId) {
        console.log(`⚠️ Run ${run.id} has no episodeId in output, setting to run.id`);
        run.output.episodeId = run.id;
      }
      
      console.log(`✅ Including completed run ${run.id} as episode:`, {
        episodeId: run.output.episodeId,
        hasAudioS3Key: !!run.output.audioS3Key,
        audioS3Key: run.output.audioS3Key,
        hasMp3S3Key: !!run.output.mp3S3Key,
        mp3S3Key: run.output.mp3S3Key,
      });
      
      return true;
    });
    
    console.log(`✅ Found ${completedRuns.length} completed runs with episodes (out of ${runs.length} total runs)`);

    // Transform runs into episodes
    const episodes = completedRuns.map((run: any) => {
      // Determine audio URL based on environment
      // For local dev, the file is stored as audio.mp3 in the run directory
      // The audioS3Key is like "runs/run_xxx/audio.mp3" which is just a path reference
      let audioUrl = '';
      
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        // Local dev: use serve-file endpoint
        // File is stored as: output/episodes/{runId}/audio.mp3
        audioUrl = `/api/serve-file/episodes/${run.id}/audio.mp3`;
      } else {
        // Production: use S3 presigned URL or CloudFront
        const audioS3Key = run.output?.audioS3Key || run.output?.mp3S3Key;
        if (audioS3Key) {
          // If it's already a full URL, use it; otherwise construct from S3 key
          audioUrl = audioS3Key.startsWith('http') 
            ? audioS3Key 
            : `${process.env.CLOUDFRONT_DOMAIN || ''}/${audioS3Key}`;
        } else {
          // Fallback: construct from run ID
          audioUrl = `/api/serve-file/episodes/${run.id}/audio.mp3`;
        }
      }

      const episodeId = run.output?.episodeId || run.id;
      
      return {
        id: episodeId,
        podcastId: podcastId,
        runId: run.id,
        title: run.output?.episodeTitle || `Episode from ${new Date(run.startedAt || run.createdAt).toLocaleDateString()}`,
        description: run.output?.episodeDescription || '',
        pubDate: run.completedAt || run.startedAt || run.createdAt,
        durationSeconds: run.output?.durationSeconds || run.duration || 0,
        audioUrl: audioUrl,
        transcriptUrl: `/api/serve-file/episodes/${run.id}/${run.id}_transcript.txt`,
        showNotesUrl: `/api/serve-file/episodes/${run.id}/${run.id}_show_notes.md`,
        episodeNumber: completedRuns.length - completedRuns.indexOf(run),
        createdAt: run.startedAt || run.createdAt,
        updatedAt: run.completedAt || run.startedAt || run.createdAt,
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

