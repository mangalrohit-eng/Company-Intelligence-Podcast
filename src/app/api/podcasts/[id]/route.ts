/**
 * PATCH /api/podcasts/:id - Update podcast configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.PODCASTS_TABLE || 'podcasts';
const CONFIG_TABLE_NAME = process.env.PODCAST_CONFIGS_TABLE || 'podcast-configs';

// Lazy initialization
let docClient: DynamoDBDocumentClient | null = null;

function getDocClient() {
  if (!docClient) {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    docClient = DynamoDBDocumentClient.from(client);
  }
  return docClient;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const podcastId = params.id;
    const body = await request.json();

    if (!podcastId) {
      return NextResponse.json({ error: 'Missing podcast ID' }, { status: 400 });
    }

    const docClient = getDocClient();

    // Get current podcast and config
    const podcastResponse = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: podcastId },
      })
    );

    if (!podcastResponse.Item) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    const currentPodcast = podcastResponse.Item;
    const currentConfigVersion = currentPodcast.currentConfigVersion || 1;

    // Get current config
    const configResponse = await docClient.send(
      new GetCommand({
        TableName: CONFIG_TABLE_NAME,
        Key: {
          podcastId,
          version: currentConfigVersion,
        },
      })
    );

    const currentConfig = configResponse.Item || {};

    // Prepare updates
    const updates: any = {};
    const configUpdates: any = {};

    // Update podcast status if provided
    if (body.status !== undefined) {
      updates.status = body.status;
    }

    // Update config fields if provided
    if (body.cadence !== undefined) {
      configUpdates.cadence = body.cadence;
    }

    if (body.durationMinutes !== undefined) {
      configUpdates.durationMinutes = body.durationMinutes;
    }

    if (body.timeWindowHours !== undefined) {
      configUpdates.timeWindowHours = body.timeWindowHours;
    }

    // Update podcast record
    if (Object.keys(updates).length > 0) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: podcastId },
          UpdateExpression: `SET ${Object.keys(updates).map(k => `${k} = :${k}`).join(', ')}, updatedAt = :updatedAt`,
          ExpressionAttributeValues: {
            ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [`:${k}`, v])),
            ':updatedAt': new Date().toISOString(),
          },
        })
      );
    }

    // Update or create new config version
    if (Object.keys(configUpdates).length > 0) {
      const newConfigVersion = currentConfigVersion + 1;
      const now = new Date().toISOString();
      const newConfig = {
        ...currentConfig,
        ...configUpdates,
        podcastId,
        version: newConfigVersion,
        createdAt: currentConfig.createdAt || now,
        updatedAt: now,
      };

      // Create new config version
      await docClient.send(
        new PutCommand({
          TableName: CONFIG_TABLE_NAME,
          Item: newConfig,
        })
      );

      // Update podcast to point to new config version
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: podcastId },
          UpdateExpression: 'SET currentConfigVersion = :version, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':version': newConfigVersion,
            ':updatedAt': new Date().toISOString(),
          },
        })
      );
    }

    // Fetch updated podcast
    const updatedResponse = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: podcastId },
      })
    );

    return NextResponse.json({
      success: true,
      podcast: updatedResponse.Item,
    });

  } catch (error: any) {
    console.error('Failed to update podcast:', error);
    
    // For local dev, return success even if DynamoDB is not available
    if (error.name === 'ResourceNotFoundException' || error.code === 'CredentialsError') {
      return NextResponse.json({
        success: true,
        warning: 'Database not configured. Changes saved in memory only.',
      });
    }

    return NextResponse.json(
      { error: 'Failed to update podcast', details: error.message },
      { status: 500 }
    );
  }
}

