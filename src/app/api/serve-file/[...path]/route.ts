/**
 * API Route: Serve Generated Files
 * GET /api/serve-file/episodes/run_xxx/audio.mp3
 * GET /api/serve-file/episodes/run_xxx/debug/prepare_input.json
 * 
 * Tries local filesystem first, then S3 if not found
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { isS3Available, readFromS3 } from '@/lib/s3-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path;

    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: 'Path parameter required' }, { status: 400 });
    }

    const relativePath = pathSegments.join('/');

    // Security: prevent directory traversal
    if (relativePath.includes('..') || relativePath.includes('~')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Determine content type
    let contentType = 'application/octet-stream';
    if (relativePath.endsWith('.mp3')) {
      contentType = 'audio/mpeg';
    } else if (relativePath.endsWith('.txt')) {
      contentType = 'text/plain';
    } else if (relativePath.endsWith('.md')) {
      contentType = 'text/markdown';
    } else if (relativePath.endsWith('.json')) {
      contentType = 'application/json';
    } else if (relativePath.endsWith('.vtt')) {
      contentType = 'text/vtt';
    }

    let fileBuffer: Buffer;

    // Try local filesystem first
    const filePath = join(process.cwd(), 'output', relativePath);
    console.log(`📂 Attempting to serve file: ${relativePath}`);

    if (existsSync(filePath)) {
      console.log(`📂 Found locally: ${filePath}`);
      fileBuffer = await readFile(filePath);
    } else if (isS3Available()) {
      // Try S3 if local file not found
      console.log(`📂 Not found locally, trying S3: ${relativePath}`);
      try {
        // Convert path to S3 key
        // e.g., "episodes/run_xxx/debug/prepare_input.json" -> "runs/run_xxx/debug/prepare_input.json"
        let s3Key = relativePath;
        if (s3Key.startsWith('episodes/')) {
          s3Key = s3Key.replace('episodes/', 'runs/');
          console.log(`🔄 Converted path: ${relativePath} -> ${s3Key}`);
        }
        
        console.log(`🔍 Looking for file in S3 with key: ${s3Key}`);
        fileBuffer = await readFromS3(s3Key);
        console.log(`✅ Found in S3: ${s3Key} (${Math.round(fileBuffer.length/1024)}KB)`);
      } catch (s3Error: any) {
        console.error(`❌ Not found in S3: ${s3Error.message}`, {
          originalPath: relativePath,
          s3Key: relativePath.startsWith('episodes/') ? relativePath.replace('episodes/', 'runs/') : relativePath,
          errorType: s3Error.constructor?.name,
          errorStack: s3Error.stack,
        });
        return NextResponse.json(
          { 
            error: 'File not found', 
            path: relativePath,
            s3Key: relativePath.startsWith('episodes/') ? relativePath.replace('episodes/', 'runs/') : relativePath,
            details: s3Error.message 
          },
          { status: 404 }
        );
      }
    } else {
      // S3 not available - check why
      const s3Available = isS3Available();
      const hasAwsCreds = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
      const hasBucket = !!(process.env.S3_BUCKET_MEDIA || process.env.ACCOUNT_ID || process.env.AWS_ACCOUNT_ID);
      
      console.error(`❌ File not found: ${filePath} (S3 not available)`, {
        s3Available,
        hasAwsCreds,
        hasBucket,
        accountId: process.env.ACCOUNT_ID,
        awsAccountId: process.env.AWS_ACCOUNT_ID,
        s3BucketMedia: process.env.S3_BUCKET_MEDIA,
        region: process.env.REGION,
        awsRegion: process.env.AWS_REGION,
      });
      
      return NextResponse.json(
        { 
          error: 'File not found', 
          path: relativePath,
          s3Available,
          hasAwsCreds,
          hasBucket,
          message: 'S3 storage is not configured. Please set AWS_ACCOUNT_ID or S3_BUCKET_MEDIA environment variable.'
        },
        { status: 404 }
      );
    }

    console.log(`✅ Serving ${relativePath} (${Math.round(fileBuffer.length/1024)}KB, ${contentType})`);

    // Convert Buffer to Uint8Array for NextResponse
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    };

    // Add CORS headers for audio files to allow cross-origin requests
    if (contentType.startsWith('audio/')) {
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Range';
      headers['Accept-Ranges'] = 'bytes';
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers,
    });
  } catch (error: any) {
    console.error('Failed to serve file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file', details: error.message },
      { status: 500 }
    );
  }
}

