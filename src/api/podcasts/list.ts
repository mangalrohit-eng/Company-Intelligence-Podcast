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
    const orgId = event.requestContext.authorizer?.claims?.['custom:org_id'];

    // Require real authentication
    if (!orgId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - Please log in' }),
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
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
};

