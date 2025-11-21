/**
 * Debug endpoint to check AWS configuration
 * GET /api/debug/aws - Check AWS credentials and DynamoDB connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export async function GET(request: NextRequest) {
  // Check for both standard AWS vars and Amplify-specific vars
  const hasAwsAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
  const hasAwsSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
  const hasAmplifyAccessKey = !!process.env.AMPLIFY_ACCESS_KEY_ID;
  const hasAmplifySecretKey = !!process.env.AMPLIFY_SECRET_ACCESS_KEY;
  
  const envCheck = {
    // Standard AWS credentials
    hasAwsAccessKey,
    hasAwsSecretKey,
    awsAccessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.substring(0, 7) || 'NOT_SET',
    awsSecretKeyLength: process.env.AWS_SECRET_ACCESS_KEY?.length || 0,
    // Amplify-specific credentials (non-AWS prefix)
    hasAmplifyAccessKey,
    hasAmplifySecretKey,
    amplifyAccessKeyPrefix: process.env.AMPLIFY_ACCESS_KEY_ID?.substring(0, 7) || 'NOT_SET',
    amplifySecretKeyLength: process.env.AMPLIFY_SECRET_ACCESS_KEY?.length || 0,
    // Combined check
    hasAnyCredentials: (hasAwsAccessKey && hasAwsSecretKey) || (hasAmplifyAccessKey && hasAmplifySecretKey),
    // Other env vars
    region: process.env.AWS_REGION || process.env.REGION || 'us-east-1',
    s3BucketMedia: process.env.S3_BUCKET_MEDIA || 'NOT_SET',
    accountId: process.env.ACCOUNT_ID || process.env.AWS_ACCOUNT_ID || 'NOT_SET',
    amplifyAppId: process.env.AMPLIFY_APP_ID || 'NOT_SET',
    amplifyBranch: process.env.AMPLIFY_BRANCH || 'NOT_SET',
  };

  const results: any = {
    environment: envCheck,
    tests: {},
  };

  // Test 1: Check if credentials are set (either AWS or Amplify vars)
  const hasCredentials = (hasAwsAccessKey && hasAwsSecretKey) || (hasAmplifyAccessKey && hasAmplifySecretKey);
  
  if (!hasCredentials) {
    results.tests.credentials = {
      status: 'FAILED',
      message: 'No AWS credentials found in environment variables',
      details: {
        awsVars: hasAwsAccessKey && hasAwsSecretKey ? 'SET' : 'NOT SET',
        amplifyVars: hasAmplifyAccessKey && hasAmplifySecretKey ? 'SET' : 'NOT SET',
        note: 'Amplify requires AMPLIFY_ACCESS_KEY_ID and AMPLIFY_SECRET_ACCESS_KEY (not AWS_ prefix)',
      },
    };
    return NextResponse.json(results, { status: 200 });
  }

  results.tests.credentials = {
    status: 'PASSED',
    message: hasAmplifyAccessKey ? 'Amplify credentials found' : 'AWS credentials found in environment',
    credentialType: hasAmplifyAccessKey ? 'AMPLIFY_*' : 'AWS_*',
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

      // Test 4: Try to scan podcasts table (get all items, handle pagination)
      if (listResponse.TableNames?.includes('podcasts')) {
        try {
          const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
          let allItems: any[] = [];
          let lastEvaluatedKey: any = undefined;
          let totalScanned = 0;
          
          // Scan all pages
          do {
            const scanCommand = new ScanCommand({
              TableName: 'podcasts',
              Limit: 100,
              ExclusiveStartKey: lastEvaluatedKey,
            });
            const scanResponse = await docClient.send(scanCommand);
            
            if (scanResponse.Items) {
              allItems = allItems.concat(scanResponse.Items);
            }
            totalScanned += scanResponse.ScannedCount || 0;
            lastEvaluatedKey = scanResponse.LastEvaluatedKey;
          } while (lastEvaluatedKey);
          
          results.tests.podcastsTable = {
            status: 'PASSED',
            message: 'Successfully accessed podcasts table',
            itemCount: allItems.length,
            totalScanned: totalScanned,
            sampleIds: allItems.slice(0, 5).map((item: any) => item.id),
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

