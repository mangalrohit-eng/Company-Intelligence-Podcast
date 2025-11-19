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
        }
        
        fileBuffer = await readFromS3(s3Key);
        console.log(`✅ Found in S3: ${s3Key}`);
      } catch (s3Error: any) {
        console.error(`❌ Not found in S3: ${s3Error.message}`);
        return NextResponse.json(
          { error: 'File not found', path: relativePath },
          { status: 404 }
        );
      }
    } else {
      console.error(`❌ File not found: ${filePath} (S3 not available)`);
      return NextResponse.json(
        { error: 'File not found', path: relativePath },
        { status: 404 }
      );
    }

    console.log(`✅ Serving ${relativePath} (${Math.round(fileBuffer.length/1024)}KB, ${contentType})`);

    // Convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Failed to serve file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file', details: error.message },
      { status: 500 }
    );
  }
}

