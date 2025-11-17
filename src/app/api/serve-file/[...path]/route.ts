/**
 * API Route: Serve Generated Files
 * GET /api/serve-file/episodes/run_xxx/audio.mp3
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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

    const filePath = join(process.cwd(), 'output', relativePath);

    console.log(`📂 Serving file: ${relativePath}`);
    console.log(`📂 Full path: ${filePath}`);

    if (!existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return NextResponse.json({ error: 'File not found', path: relativePath }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    
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

    console.log(`✅ Serving ${relativePath} (${Math.round(fileBuffer.length/1024)}KB, ${contentType})`);

    return new NextResponse(fileBuffer, {
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

