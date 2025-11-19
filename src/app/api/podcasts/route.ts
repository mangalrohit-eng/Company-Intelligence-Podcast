/**
 * API Route: Podcasts
 * GET /api/podcasts - List all podcasts
 * POST /api/podcasts - Create new podcast
 */

import 'dotenv/config'; // Load .env file explicitly
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

// Initialize DynamoDB client
// AWS SDK will automatically use credentials from:
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// 2. AWS CLI config (~/.aws/credentials)
// 3. IAM role (if running on EC2/Lambda)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  // Credentials will be picked up automatically from environment or AWS CLI config
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'podcasts';

// GET /api/podcasts - List all podcasts
export async function GET(request: NextRequest) {
  try {
    // Enhanced logging for debugging
    const envCheck = {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.substring(0, 7) || 'NOT_SET',
      secretKeyLength: process.env.AWS_SECRET_ACCESS_KEY?.length || 0,
    };
    
    console.log(`📡 Fetching podcasts from DynamoDB table: ${TABLE_NAME}`);
    console.log(`🔑 AWS Environment Check:`, envCheck);
    
    // Check if credentials are missing
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('❌ Missing AWS credentials in environment variables');
      return NextResponse.json({
        podcasts: [],
        count: 0,
        error: 'AWS credentials not configured',
        debug: {
          message: 'AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is missing',
          envCheck,
        },
      }, { status: 200 }); // Return 200 so frontend can show error
    }
    
    // DynamoDB Scan can be paginated - we need to handle all pages
    let allItems: any[] = [];
    let lastEvaluatedKey: any = undefined;
    let totalScanned = 0;
    
    do {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        Limit: 100, // Scan up to 100 items per page
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const response = await docClient.send(command);
      
      if (response.Items) {
        allItems = allItems.concat(response.Items);
      }
      
      totalScanned += response.ScannedCount || 0;
      lastEvaluatedKey = response.LastEvaluatedKey;
      
      console.log(`📄 Scan page: ${response.Items?.length || 0} items, ${response.ScannedCount || 0} scanned, hasMore: ${!!lastEvaluatedKey}`);
    } while (lastEvaluatedKey);
    
    console.log(`✅ Successfully fetched ${allItems.length} podcasts from DynamoDB (scanned ${totalScanned} items)`);

    return NextResponse.json({
      podcasts: allItems,
      count: allItems.length,
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch podcasts:', error);
    console.error('❌ Error details:', {
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.$metadata?.httpStatusCode,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });
    
    // Enhanced error handling with more specific messages
    if (error.name === 'ResourceNotFoundException') {
      return NextResponse.json({
        podcasts: [],
        count: 0,
        error: 'DynamoDB table not found',
        debug: {
          message: `Table '${TABLE_NAME}' does not exist in region ${process.env.AWS_REGION || 'us-east-1'}`,
          suggestion: 'Check if the table exists in AWS Console or if the region is correct',
        },
      }, { status: 200 });
    }
    
    if (error.name === 'UnrecognizedClientException' || error.code === 'CredentialsError' || error.message?.includes('credentials')) {
      return NextResponse.json({
        podcasts: [],
        count: 0,
        error: 'AWS credentials invalid or missing',
        debug: {
          message: 'Unable to authenticate with AWS. Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY',
          suggestion: 'Verify credentials in Vercel environment variables and ensure they have DynamoDB permissions',
        },
      }, { status: 200 });
    }

    return NextResponse.json({
      podcasts: [],
      count: 0,
      error: 'Failed to fetch podcasts',
      debug: {
        message: error.message,
        code: error.code,
        name: error.name,
      },
    }, { status: 200 }); // Return 200 so frontend can display error
  }
}

// Helper to extract auth context from Next.js request
function extractAuthFromRequest(request: NextRequest): { userId: string; orgId: string } | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Decode JWT token (without verification for local dev)
    // Format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (base64url)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    const userId = payload.sub;
    if (!userId) {
      return null;
    }

    // Extract orgId from custom claim or generate for legacy users
    let orgId = payload['custom:org_id'];
    if (!orgId) {
      // Legacy user - generate orgId
      orgId = `org-${userId}`;
    }

    return { userId, orgId };
  } catch (error) {
    console.error('Failed to extract auth from request:', error);
    return null;
  }
}

// POST /api/podcasts - Create new podcast
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
    const { title, description, companyId, competitors, topics, topicPriorities, duration, voice, schedule } = body;

    if (!title || !companyId) {
      return NextResponse.json(
        { error: 'Title and companyId are required' },
        { status: 400 }
      );
    }

    // Extract auth context from request
    const auth = extractAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required - Please log in' },
        { status: 401 }
      );
    }

    const { userId, orgId } = auth;
    const podcastId = `podcast_${randomUUID()}`;
    const now = new Date().toISOString();

    // Log what we're receiving
    console.log(`📝 Creating podcast with data:`, {
      title,
      companyId,
      topics: topics,
      topicsLength: topics?.length || 0,
      topicPriorities: topicPriorities,
      hasTopics: !!topics && topics.length > 0,
      userId: userId.substring(0, 8) + '...',
      orgId: orgId.substring(0, 12) + '...',
    });

    const podcast = {
      id: podcastId,
      orgId, // CRITICAL: Add orgId so it shows up in Amplify
      ownerUserId: userId, // Track owner
      title,
      description: description || '',
      companyId,
      competitors: competitors || [],
      topics: topics || [],
      topicPriorities: topicPriorities || {},
      config: {
        duration: duration || 5,
        voice: voice || 'alloy',
        schedule: schedule || 'manual',
      },
      status: 'active',
      createdAt: now,
      updatedAt: now,
      episodeCount: 0,
      lastRunAt: null,
    };

    // Warn if topics are empty
    if (!topics || topics.length === 0) {
      console.warn(`⚠️ Creating podcast WITHOUT topics!`, {
        podcastId,
        title,
        topicsReceived: topics,
        bodyKeys: Object.keys(body),
      });
    } else {
      console.log(`✅ Creating podcast WITH ${topics.length} topics:`, topics);
    }

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: podcast,
    });

    await docClient.send(command);

    return NextResponse.json({
      ...podcast,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Failed to create podcast:', error);

    // If DynamoDB is not available, return success with warning
    if (error.name === 'ResourceNotFoundException' || error.code === 'CredentialsError') {
      const podcastId = `podcast_${randomUUID()}`;
      return NextResponse.json({
        id: podcastId,
        title: body.title,
        warning: 'Database not configured. Podcast created in memory only.',
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Failed to create podcast', details: error.message },
      { status: 500 }
    );
  }
}

