/**
 * GET /podcasts - List user's podcasts
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/utils/logger';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract orgId from authorizer - REAL AUTH ONLY, NO BYPASSES
    // API Gateway HTTP API uses different structure than REST API
    const authorizer = event.requestContext?.authorizer;
    const orgId = authorizer?.claims?.['custom:org_id'] ||  authorizer?.jwt?.claims?.['custom:org_id'];

    // Require real authentication
    if (!orgId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Unauthorized - Please log in',
          debug: 'No org_id found in authorizer context'
        }),
      };
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.PODCASTS_TABLE!,
        IndexName: 'OrgIdIndex',
        KeyConditionExpression: 'orgId = :orgId',
        ExpressionAttributeValues: {
          ':orgId': orgId,
        },
        Limit: 50,
      })
    );

    logger.info('Listed podcasts', { orgId, count: result.Items?.length || 0 });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        podcasts: result.Items || [],
        nextToken: result.LastEvaluatedKey,
      }),
    };
  } catch (error) {
    logger.error('Failed to list podcasts', { error });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};

