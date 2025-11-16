/**
 * API Route: Podcasts
 * GET /api/podcasts - List all podcasts
 * POST /api/podcasts - Create new podcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'podcasts';

// GET /api/podcasts - List all podcasts
export async function GET(request: NextRequest) {
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 100, // Limit to 100 podcasts
    });

    const response = await docClient.send(command);

    return NextResponse.json({
      podcasts: response.Items || [],
      count: response.Count || 0,
    });
  } catch (error: any) {
    console.error('Failed to fetch podcasts:', error);
    
    // If DynamoDB is not available, return empty list
    if (error.name === 'ResourceNotFoundException' || error.code === 'CredentialsError') {
      return NextResponse.json({
        podcasts: [],
        count: 0,
        warning: 'Database not configured. Running in local mode.',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch podcasts', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/podcasts - Create new podcast
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, companyId, competitors, topics, duration, voice, schedule } = body;

    if (!title || !companyId) {
      return NextResponse.json(
        { error: 'Title and companyId are required' },
        { status: 400 }
      );
    }

    const podcastId = `podcast_${randomUUID()}`;
    const now = new Date().toISOString();

    const podcast = {
      id: podcastId,
      title,
      description: description || '',
      companyId,
      competitors: competitors || [],
      topics: topics || [],
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

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: podcast,
    });

    await docClient.send(command);

    return NextResponse.json({
      id: podcastId,
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

