/**
 * GET /runs/:id/events - Get run events for live progress tracking
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/utils/logger';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const runId = event.pathParameters?.id;
    const limit = parseInt(event.queryStringParameters?.limit || '100');
    const nextToken = event.queryStringParameters?.nextToken;

    if (!runId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Run ID required' }),
      };
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.RUN_EVENTS_TABLE!,
        IndexName: 'RunIdIndex',
        KeyConditionExpression: 'runId = :runId',
        ExpressionAttributeValues: {
          ':runId': runId,
        },
        Limit: limit,
        ExclusiveStartKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined,
        ScanIndexForward: false, // newest first
      })
    );

    const events = result.Items || [];
    const responseNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    logger.debug('Retrieved run events', { runId, count: events.length });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        events,
        nextToken: responseNextToken,
      }),
    };
  } catch (error) {
    logger.error('Failed to get run events', { error });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
      }),
    };
  }
};

