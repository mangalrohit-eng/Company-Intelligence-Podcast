/**
 * S3 Storage Utility
 * Handles reading and writing debug files to S3
 */

import 'dotenv/config'; // Load .env.production file explicitly
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { logger } from '@/utils/logger';

let s3Client: S3Client | null = null;

function resetS3Client() {
  s3Client = null;
  logger.info('S3 client reset');
}

function getS3Client(): S3Client {
  if (!s3Client) {
    // Use REGION (non-AWS prefix) for Amplify compatibility, fallback to AWS_REGION for Lambda
    const region = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
    
    logger.info('Initializing S3 client', {
      region,
      hasREGION: !!process.env.REGION,
      hasAWS_REGION: !!process.env.AWS_REGION,
      hasAMPLIFY_ACCESS_KEY_ID: !!process.env.AMPLIFY_ACCESS_KEY_ID,
      hasAMPLIFY_SECRET_ACCESS_KEY: !!process.env.AMPLIFY_SECRET_ACCESS_KEY,
      hasAWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      hasAWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
      isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
    });
    
    // Configure credentials provider
    // Priority:
    // 1. IAM roles via defaultProvider (for Lambda/EC2 with IAM roles) - BEST for AWS services
    // 2. Standard AWS env vars (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) - for local dev
    // 3. Custom env vars (AMPLIFY_ACCESS_KEY_ID, AMPLIFY_SECRET_ACCESS_KEY) - fallback only
    
    let credentialsProvider;
    
    // Priority for credentials:
    // 1. Explicit credentials (AMPLIFY_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID) - most reliable
    // 2. IAM roles via defaultProvider - works in regular Lambda, but may not work in Amplify Lambda
    
    // Check for custom Amplify env vars first (non-AWS prefix) - works in Amplify Lambda
    if (process.env.AMPLIFY_ACCESS_KEY_ID && process.env.AMPLIFY_SECRET_ACCESS_KEY) {
      logger.info('Using custom Amplify credentials (AMPLIFY_ACCESS_KEY_ID)', {
        hasAccessKey: !!process.env.AMPLIFY_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AMPLIFY_SECRET_ACCESS_KEY,
        accessKeyPrefix: process.env.AMPLIFY_ACCESS_KEY_ID?.substring(0, 7),
      });
      credentialsProvider = async () => {
        const creds = {
          accessKeyId: process.env.AMPLIFY_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AMPLIFY_SECRET_ACCESS_KEY!,
        };
        logger.debug('Amplify credentials provider called', {
          hasAccessKey: !!creds.accessKeyId,
          hasSecretKey: !!creds.secretAccessKey,
        });
        return creds;
      };
    }
    // Check for explicit AKIA keys (long-term IAM user keys) - prioritize these if set
    // AKIA keys are long-term, ASIA keys are temporary from IAM roles
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_ACCESS_KEY_ID.startsWith('AKIA')) {
      logger.info('Using explicit AKIA credentials (AWS_ACCESS_KEY_ID)', {
        accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID.substring(0, 7),
        isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      });
      credentialsProvider = async () => ({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      });
    }
    // In Lambda, use IAM role (defaultProvider) if no explicit AKIA key is set
    // This will use temporary ASIA credentials from the IAM role
    else if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      logger.info('Using IAM role via defaultProvider (Lambda environment)', {
        region,
        hasAWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
        hasAWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        awsAccessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.substring(0, 4) || 'none',
        note: 'Using temporary ASIA credentials from IAM role (this is normal for Lambda)',
      });
      credentialsProvider = defaultProvider();
    }
    // Check for standard AWS env vars (for local dev only, not Lambda)
    else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      logger.info('Using standard AWS credentials (AWS_ACCESS_KEY_ID) - local dev');
      credentialsProvider = async () => ({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      });
    }
    // Fallback to IAM roles (defaultProvider) - for EC2, ECS, etc.
    else {
      logger.info('Using default credential provider (IAM roles/instance metadata)', {
        region,
        isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      });
      credentialsProvider = defaultProvider();
    }
    
    s3Client = new S3Client({
      region,
      credentials: credentialsProvider,
      // Add maxAttempts to prevent infinite retries
      maxAttempts: 3,
    });
    
    logger.info('S3 client initialized', { 
      region,
      maxAttempts: 3,
      credentialsType: process.env.AMPLIFY_ACCESS_KEY_ID ? 'AMPLIFY' : 
                       process.env.AWS_ACCESS_KEY_ID ? 'AWS_ENV' : 'IAM_ROLE',
    });
  }
  return s3Client;
}

/**
 * Get the S3 bucket name for media/debug files
 */
function getMediaBucket(): string | null {
  // Try environment variable first (non-AWS prefix for Amplify compatibility)
  if (process.env.S3_BUCKET_MEDIA) {
    return process.env.S3_BUCKET_MEDIA;
  }
  
  // Fallback: construct from account ID if available (non-AWS prefix)
  if (process.env.ACCOUNT_ID) {
    return `podcast-platform-media-${process.env.ACCOUNT_ID}`;
  }
  
  // Legacy support: try AWS_ACCOUNT_ID (won't work in Amplify, but works in Lambda)
  if (process.env.AWS_ACCOUNT_ID) {
    return `podcast-platform-media-${process.env.AWS_ACCOUNT_ID}`;
  }
  
  // Try to get account ID from Amplify environment variables
  // Amplify sets AWS_ACCOUNT_ID in some contexts, or we can try to detect it
  // For now, if we're in an AWS environment, try the default bucket name pattern
  // This is a fallback - ideally ACCOUNT_ID should be set in Amplify env vars
  if (process.env.AWS_REGION || process.env.REGION) {
    // We're in AWS but don't have account ID - this is a configuration issue
    // But we can still try to use S3 with IAM roles if the bucket name is known
    // Default to the known bucket name for this account (098478926952)
    // This is a temporary workaround - the proper fix is to set ACCOUNT_ID in Amplify
    return 'podcast-platform-media-098478926952';
  }
  
  // If no bucket configured, return null (will fall back to local filesystem)
  return null;
}

/**
 * Check if S3 storage is available and should be used
 * 
 * Works with:
 * - Explicit credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - IAM roles (when running on AWS services like Amplify, Lambda, EC2)
 * - Default credential chain (AWS SDK will automatically use IAM roles)
 */
export function isS3Available(): boolean {
  const bucket = getMediaBucket();
  if (!bucket) {
    return false;
  }
  
  // If we have explicit credentials, use them
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return true;
  }
  
  // If we're in an AWS environment (Amplify, Lambda, EC2), IAM roles will be available
  // Check for AWS-specific environment variables that indicate we're in AWS
  if (
    process.env.AWS_EXECUTION_ENV || // Lambda
    process.env.AWS_LAMBDA_FUNCTION_NAME || // Lambda
    process.env.ECS_CONTAINER_METADATA_URI || // ECS
    process.env.AWS_REGION || // Any AWS service
    process.env.REGION || // Amplify uses REGION
    process.env.AWS_ACCOUNT_ID || // Any AWS service
    process.env.ACCOUNT_ID || // Amplify uses ACCOUNT_ID
    process.env.AMPLIFY_APP_ID || // Amplify-specific
    process.env.AMPLIFY_BRANCH || // Amplify-specific
    process.env.S3_BUCKET_MEDIA // If S3_BUCKET_MEDIA is set, we're likely in AWS
  ) {
    return true;
  }
  
  return false;
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
    logger.info('Starting S3 write', { bucket, key, contentType, contentSize: typeof content === 'string' ? content.length : content.length });
    
    const client = getS3Client();
    const body = typeof content === 'string' ? content : content;
    
    // Add timeout to prevent hanging (30 seconds for JSON, 60 seconds for audio)
    const timeoutMs = contentType.startsWith('audio/') ? 60000 : 30000;
    
    logger.debug('Sending PutObjectCommand to S3', { bucket, key, timeoutMs });
    
    const writePromise = client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`S3 write timeout after ${timeoutMs}ms`)), timeoutMs)
    );
    
    logger.debug('Waiting for S3 write to complete or timeout', { timeoutMs });
    await Promise.race([writePromise, timeoutPromise]);
    
    logger.info('File written to S3 successfully', { bucket, key, contentType, size: typeof content === 'string' ? content.length : content.length });
  } catch (error) {
    logger.error('Failed to write file to S3', { 
      bucket, 
      key, 
      contentType,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    // Reset S3 client on error to force re-initialization on next call
    // This helps if credentials or region were misconfigured
    resetS3Client();
    throw error;
  }
}

/**
 * Read a file from S3
 */
export async function readFromS3(key: string): Promise<Buffer> {
  const bucket = getMediaBucket();
  if (!bucket) {
    const error = new Error(`S3 bucket not configured. ACCOUNT_ID: ${process.env.ACCOUNT_ID}, S3_BUCKET_MEDIA: ${process.env.S3_BUCKET_MEDIA}`);
    logger.error('S3 bucket not configured', { 
      accountId: process.env.ACCOUNT_ID,
      awsAccountId: process.env.AWS_ACCOUNT_ID, // Legacy
      s3BucketMedia: process.env.S3_BUCKET_MEDIA,
      key 
    });
    throw error;
  }

  try {
    const client = getS3Client();
    logger.debug('Reading from S3', { bucket, key });
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
    logger.error('Failed to read file from S3', { 
      bucket, 
      key, 
      errorName: error.name,
      errorCode: error.Code,
      errorMessage: error.message,
      httpStatusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      error 
    });
    
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      const notFoundError: any = new Error('File not found');
      notFoundError.code = 'NoSuchKey';
      notFoundError.s3Key = key;
      notFoundError.bucket = bucket;
      throw notFoundError;
    }
    
    // For other errors, preserve the original error but add context
    error.s3Key = key;
    error.bucket = bucket;
    throw error;
  }
}

/**
 * Generate a presigned URL for reading from S3 (for large files like audio)
 * Returns a URL that expires in the specified number of seconds (default 1 hour)
 */
export async function getPresignedReadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const bucket = getMediaBucket();
  if (!bucket) {
    throw new Error('S3 bucket not configured');
  }

  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    const url = await getSignedUrl(client, command, { expiresIn });
    logger.info('Generated presigned URL', { bucket, key, expiresIn });
    return url;
  } catch (error: any) {
    logger.error('Failed to generate presigned URL', { bucket, key, error });
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

