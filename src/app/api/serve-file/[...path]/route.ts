/**
 * API Route: Serve Generated Files
 * GET /api/serve-file/episodes/run_xxx/audio.mp3
 * GET /api/serve-file/episodes/run_xxx/debug/prepare_input.json
 * 
 * Tries local filesystem first, then S3 if not found
 */

import 'dotenv/config'; // Load .env.production file explicitly
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { isS3Available, readFromS3, getPresignedReadUrl } from '@/lib/s3-storage';

// Handle OPTIONS requests for CORS preflight (required for audio playback)
export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path;
  const relativePath = pathSegments.join('/');
  const isAudio = relativePath.endsWith('.mp3');
  
  if (isAudio) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  return new NextResponse(null, { status: 200 });
}

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

    // For audio files, always redirect to S3 presigned URL to avoid Amplify response size limits
    // This avoids loading the entire file into memory and hitting 413 errors
    if (contentType.startsWith('audio/') && isS3Available()) {
      try {
        let s3Key = relativePath;
        if (s3Key.startsWith('episodes/')) {
          s3Key = s3Key.replace('episodes/', 'runs/');
        }
        const presignedUrl = await getPresignedReadUrl(s3Key, 3600); // 1 hour expiry
        console.log(`🔄 Redirecting audio file to S3 presigned URL: ${s3Key}`);
        return NextResponse.redirect(presignedUrl, 307); // 307 Temporary Redirect
      } catch (error: any) {
        console.error('Failed to generate presigned URL for audio file', error);
        // Fall through to try reading from S3 (may fail with 413, but worth trying)
      }
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
        // Check credentials and environment for debugging
        const hasAmplifyCreds = !!(process.env.AMPLIFY_ACCESS_KEY_ID && process.env.AMPLIFY_SECRET_ACCESS_KEY);
        const hasAwsCreds = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
        const s3Available = isS3Available();
        
        const envDebug = {
          s3Available,
          hasAmplifyCreds,
          hasAwsCreds,
          amplifyAccessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID ? `${process.env.AMPLIFY_ACCESS_KEY_ID.substring(0, 7)}...` : 'NOT SET',
          amplifySecretKey: process.env.AMPLIFY_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
          awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 7)}...` : 'NOT SET',
          awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
          s3BucketMedia: process.env.S3_BUCKET_MEDIA || 'NOT SET',
          region: process.env.REGION || process.env.AWS_REGION || 'NOT SET',
          accountId: process.env.ACCOUNT_ID || process.env.AWS_ACCOUNT_ID || 'NOT SET',
          amplifyAppId: process.env.AMPLIFY_APP_ID || 'NOT SET',
          amplifyBranch: process.env.AMPLIFY_BRANCH || 'NOT SET',
          relevantEnvVars: Object.keys(process.env)
            .filter(key => 
              key.includes('ACCOUNT') || 
              key.includes('BUCKET') || 
              key.includes('S3') || 
              key.includes('REGION') ||
              key.includes('AWS') ||
              key.includes('AMPLIFY')
            )
            .reduce((acc, key) => {
              if (key.includes('SECRET') || key.includes('KEY')) {
                acc[key] = process.env[key] ? 'SET' : 'NOT SET';
              } else {
                acc[key] = process.env[key] || 'NOT SET';
              }
              return acc;
            }, {} as Record<string, string>),
        };
        
        // Extract more detailed error information
        const errorDetails = {
          message: s3Error.message || 'Unknown error',
          name: s3Error.name || s3Error.constructor?.name || 'Unknown',
          code: s3Error.code || s3Error.Code || 'Unknown',
          httpStatusCode: s3Error.$metadata?.httpStatusCode,
          requestId: s3Error.$metadata?.requestId,
          s3Key: s3Error.s3Key || (relativePath.startsWith('episodes/') ? relativePath.replace('episodes/', 'runs/') : relativePath),
          bucket: s3Error.bucket || process.env.S3_BUCKET_MEDIA || 'NOT SET',
        };
        
        console.error(`❌ S3 error: ${s3Error.message}`, {
          originalPath: relativePath,
          s3Key: errorDetails.s3Key,
          errorType: errorDetails.name,
          errorCode: errorDetails.code,
          httpStatusCode: errorDetails.httpStatusCode,
          errorStack: s3Error.stack,
          envDebug,
          errorDetails,
        });
        
        return NextResponse.json(
          { 
            error: 'File not found', 
            path: relativePath,
            s3Key: errorDetails.s3Key,
            details: errorDetails.message,
            errorDetails, // Include detailed error info
            envDebug, // Include debug info in error response
          },
          { status: 404 }
        );
      }
    } else {
      // S3 not available - check why
      const s3Available = isS3Available();
      const hasAwsCreds = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
      const hasAmplifyCreds = !!(process.env.AMPLIFY_ACCESS_KEY_ID && process.env.AMPLIFY_SECRET_ACCESS_KEY);
      const hasBucket = !!(process.env.S3_BUCKET_MEDIA || process.env.ACCOUNT_ID || process.env.AWS_ACCOUNT_ID);
      
      // Log all relevant environment variables for debugging
      const envDebug = {
        s3Available,
        hasAwsCreds,
        hasBucket,
        accountId: process.env.ACCOUNT_ID,
        awsAccountId: process.env.AWS_ACCOUNT_ID,
        s3BucketMedia: process.env.S3_BUCKET_MEDIA,
        region: process.env.REGION,
        awsRegion: process.env.AWS_REGION,
        awsExecutionEnv: process.env.AWS_EXECUTION_ENV,
        awsLambdaFunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        // Check for Amplify-specific env vars
        amplifyAppId: process.env.AMPLIFY_APP_ID,
        amplifyBranchName: process.env.AMPLIFY_BRANCH,
        // List all env vars that contain 'ACCOUNT', 'BUCKET', 'S3', or 'REGION' (for debugging)
        relevantEnvVars: Object.keys(process.env)
          .filter(key => 
            key.includes('ACCOUNT') || 
            key.includes('BUCKET') || 
            key.includes('S3') || 
            key.includes('REGION') ||
            key.includes('AWS')
          )
          .reduce((acc, key) => {
            acc[key] = process.env[key] ? 'SET' : 'NOT SET';
            return acc;
          }, {} as Record<string, string>),
      };
      
      console.error(`❌ File not found: ${filePath} (S3 not available)`, envDebug);
      
      return NextResponse.json(
        { 
          error: 'File not found', 
          path: relativePath,
          s3Available,
          hasAwsCreds,
          hasBucket,
          envDebug, // Include debug info in response
          message: 'S3 storage is not configured. Please set ACCOUNT_ID or S3_BUCKET_MEDIA environment variable in Amplify.'
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
      headers['Access-Control-Allow-Headers'] = 'Range, Content-Type';
      headers['Accept-Ranges'] = 'bytes';
      // Support range requests for audio seeking
      const range = request.headers.get('range');
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileBuffer.length - 1;
        const chunksize = (end - start) + 1;
        const chunk = fileBuffer.slice(start, end + 1);
        
        return new NextResponse(new Uint8Array(chunk), {
          status: 206, // Partial Content
          headers: {
            ...headers,
            'Content-Range': `bytes ${start}-${end}/${fileBuffer.length}`,
            'Content-Length': chunksize.toString(),
          },
        });
      }
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

