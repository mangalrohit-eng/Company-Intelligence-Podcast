/**
 * Debug endpoint to check AWS configuration
 * GET /api/debug/aws - Check AWS credentials and DynamoDB connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export async function GET(request: NextRequest) {
  const envCheck = {
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.substring(0, 7) || 'NOT_SET',
    secretKeyLength: process.env.AWS_SECRET_ACCESS_KEY?.length || 0,
  };

  const results: any = {
    environment: envCheck,
    tests: {},
  };

  // Test 1: Check if credentials are set
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    results.tests.credentials = {
      status: 'FAILED',
      message: 'AWS credentials not found in environment variables',
    };
    return NextResponse.json(results, { status: 200 });
  }

  results.tests.credentials = {
    status: 'PASSED',
    message: 'AWS credentials found in environment',
  };

  // Test 2: Try to create DynamoDB client
  try {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    const docClient = DynamoDBDocumentClient.from(client);

    results.tests.clientCreation = {
      status: 'PASSED',
      message: 'DynamoDB client created successfully',
    };

    // Test 3: Try to list tables (requires DynamoDB permissions)
    // Note: ListTablesCommand must be used with the base client, not docClient
    try {
      const listCommand = new ListTablesCommand({});
      const listResponse = await client.send(listCommand);
      
      results.tests.dynamodbConnection = {
        status: 'PASSED',
        message: 'Successfully connected to DynamoDB',
        tables: listResponse.TableNames || [],
        hasPodcastsTable: listResponse.TableNames?.includes('podcasts') || false,
      };

      // Test 4: Try to scan podcasts table
      if (listResponse.TableNames?.includes('podcasts')) {
        try {
          const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
          const scanCommand = new ScanCommand({
            TableName: 'podcasts',
            Limit: 1,
          });
          const scanResponse = await docClient.send(scanCommand);
          
          results.tests.podcastsTable = {
            status: 'PASSED',
            message: 'Successfully accessed podcasts table',
            itemCount: scanResponse.Count || 0,
            scannedCount: scanResponse.ScannedCount || 0,
          };
        } catch (scanError: any) {
          results.tests.podcastsTable = {
            status: 'FAILED',
            message: 'Failed to scan podcasts table',
            error: scanError.message,
            code: scanError.code,
          };
        }
      } else {
        results.tests.podcastsTable = {
          status: 'FAILED',
          message: 'Podcasts table not found in DynamoDB',
          suggestion: 'Check if the table exists or if you are in the correct AWS region',
        };
      }
    } catch (listError: any) {
      results.tests.dynamodbConnection = {
        status: 'FAILED',
        message: 'Failed to connect to DynamoDB',
        error: listError.message,
        code: listError.code,
        name: listError.name,
        suggestion: 'Check AWS credentials and IAM permissions',
      };
    }
  } catch (clientError: any) {
    results.tests.clientCreation = {
      status: 'FAILED',
      message: 'Failed to create DynamoDB client',
      error: clientError.message,
    };
  }

  return NextResponse.json(results, { status: 200 });
}

