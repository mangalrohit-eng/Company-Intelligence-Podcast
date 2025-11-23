/**
 * API Route: Serve Generated Files
 * GET /api/serve-file/episodes/run_xxx/audio.mp3
 * 
 * Supports both local file system (development) and S3 (production)
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

    // Try local file system first (for development)
    const filePath = join(process.cwd(), 'output', relativePath);

    if (existsSync(filePath)) {
      console.log(`📂 Serving local file: ${relativePath}`);
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
    }

    // If file not found locally, try S3 (production)
    const s3Bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET_MEDIA;
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
    
    if (s3Bucket || cloudfrontDomain) {
      // Redirect to CloudFront if available, otherwise return S3 presigned URL info
      if (cloudfrontDomain) {
        const s3Key = relativePath.startsWith('runs/') ? relativePath : `runs/${relativePath}`;
        const cloudfrontUrl = `https://${cloudfrontDomain}/${s3Key}`;
        console.log(`🔄 Redirecting to CloudFront: ${cloudfrontUrl}`);
        return NextResponse.redirect(cloudfrontUrl, 307);
      } else if (s3Bucket) {
        // Generate presigned URL for S3
        try {
          const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
          const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
          
          const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
          const s3Key = relativePath.startsWith('runs/') ? relativePath : `runs/${relativePath}`;
          
          const command = new GetObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
          });
          
          const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          console.log(`🔄 Redirecting to S3 presigned URL: ${s3Key}`);
          return NextResponse.redirect(presignedUrl, 307);
        } catch (s3Error: any) {
          console.error('Failed to generate S3 presigned URL:', s3Error);
          // Fall through to 404
        }
      }
    }

    // File not found
    console.error(`❌ File not found: ${relativePath} (checked local and S3)`);
    return NextResponse.json({ error: 'File not found', path: relativePath }, { status: 404 });
  } catch (error: any) {
    console.error('Failed to serve file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file', details: error.message },
      { status: 500 }
    );
  }
}

