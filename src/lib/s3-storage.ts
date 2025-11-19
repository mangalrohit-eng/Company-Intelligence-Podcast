/**
 * S3 Storage Utility
 * Handles reading and writing debug files to S3
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/utils/logger';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return s3Client;
}

/**
 * Get the S3 bucket name for media/debug files
 */
function getMediaBucket(): string | null {
  // Try environment variable first
  if (process.env.S3_BUCKET_MEDIA) {
    return process.env.S3_BUCKET_MEDIA;
  }
  
  // Fallback: construct from account ID if available
  if (process.env.AWS_ACCOUNT_ID) {
    return `podcast-platform-media-${process.env.AWS_ACCOUNT_ID}`;
  }
  
  // If no bucket configured, return null (will fall back to local filesystem)
  return null;
}

/**
 * Check if S3 storage is available and should be used
 * 
 * Always use S3 when AWS credentials are present - no difference between local and Vercel.
 * This ensures consistent behavior across all environments.
 */
export function isS3Available(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    getMediaBucket()
  );
}

/**
 * Write a file to S3
 */
export async function writeToS3(
  key: string,
  content: string | Buffer,
  contentType: string = 'application/json'
): Promise<void> {
  const bucket = getMediaBucket();
  if (!bucket) {
    throw new Error('S3 bucket not configured');
  }

  try {
    const client = getS3Client();
    const body = typeof content === 'string' ? content : content;
    
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    
    logger.info('File written to S3', { bucket, key, contentType });
  } catch (error) {
    logger.error('Failed to write file to S3', { bucket, key, error });
    throw error;
  }
}

/**
 * Read a file from S3
 */
export async function readFromS3(key: string): Promise<Buffer> {
  const bucket = getMediaBucket();
  if (!bucket) {
    throw new Error('S3 bucket not configured');
  }

  try {
    const client = getS3Client();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error('Empty response from S3');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    logger.info('File read from S3', { bucket, key, size: buffer.length });
    return buffer;
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      throw new Error('File not found');
    }
    logger.error('Failed to read file from S3', { bucket, key, error });
    throw error;
  }
}

/**
 * Get S3 key for a debug file
 */
export function getDebugFileKey(runId: string, filename: string): string {
  return `runs/${runId}/debug/${filename}`;
}

/**
 * Get S3 key for an audio file
 */
export function getAudioFileKey(runId: string): string {
  return `runs/${runId}/audio.mp3`;
}

/**
 * Get S3 key for admin settings
 */
export function getAdminSettingsKey(): string {
  return 'admin/settings.json';
}

/**
 * Get S3 key for a stop flag
 */
export function getStopFlagKey(runId: string): string {
  return `runs/${runId}/stop.flag`;
}

