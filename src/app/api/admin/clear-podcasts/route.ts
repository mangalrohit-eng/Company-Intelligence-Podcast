/**
 * Admin API: Clear all podcasts (for local development)
 * DELETE /api/admin/clear-podcasts
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { runsStore } from '@/lib/runs-store';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Clearing all podcasts...');
    
    let deletedCount = 0;
    
    // Try to clear from DynamoDB
    try {
      const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const docClient = DynamoDBDocumentClient.from(client);
      
      // Scan all podcasts
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: 'podcasts',
        })
      );
      
      // Delete each podcast
      if (scanResult.Items && scanResult.Items.length > 0) {
        for (const item of scanResult.Items) {
          await docClient.send(
            new DeleteCommand({
              TableName: 'podcasts',
              Key: { id: item.id },
            })
          );
          deletedCount++;
          console.log(`✅ Deleted podcast: ${item.id} (${item.title})`);
        }
      }
      
      console.log(`✅ Deleted ${deletedCount} podcasts from DynamoDB`);
    } catch (error: any) {
      console.warn(`⚠️ Could not clear DynamoDB (local dev mode):`, error.message);
    }
    
    // Clear in-memory runs store
    const runStoreKeys = Object.keys(runsStore);
    for (const key of runStoreKeys) {
      delete runsStore[key];
    }
    console.log(`✅ Cleared ${runStoreKeys.length} podcast runs from memory`);
    
    return NextResponse.json({
      success: true,
      deletedPodcasts: deletedCount,
      clearedRuns: runStoreKeys.length,
      message: 'All podcasts and runs cleared successfully',
    });
  } catch (error: any) {
    console.error('Failed to clear podcasts:', error);
    return NextResponse.json(
      { error: 'Failed to clear podcasts', details: error.message },
      { status: 500 }
    );
  }
}

