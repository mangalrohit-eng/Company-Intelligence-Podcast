/**
 * API Response Utilities
 * Provides consistent response formatting with proper headers
 */

import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Standard API response headers
 */
export const standardHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Create a standard API Gateway response with proper headers
 * 
 * @param statusCode HTTP status code
 * @param data Response data (will be JSON stringified)
 * @param additionalHeaders Optional additional headers to merge
 * @returns Formatted API Gateway response
 */
export function apiResponse(
  statusCode: number,
  data: any,
  additionalHeaders: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      ...standardHeaders,
      ...additionalHeaders,
    },
    body: JSON.stringify(data),
  };
}

/**
 * Create a success response (200 OK)
 */
export function successResponse(data: any): APIGatewayProxyResult {
  return apiResponse(200, data);
}

/**
 * Create a created response (201 Created)
 */
export function createdResponse(data: any): APIGatewayProxyResult {
  return apiResponse(201, data);
}

/**
 * Create an accepted response (202 Accepted)
 */
export function acceptedResponse(data: any): APIGatewayProxyResult {
  return apiResponse(202, data);
}

/**
 * Create a bad request error response (400)
 */
export function badRequestResponse(message: string, details?: any): APIGatewayProxyResult {
  return apiResponse(400, {
    error: message,
    ...(details && { details }),
  });
}

/**
 * Create an unauthorized error response (401)
 */
export function unauthorizedResponse(message: string = 'Authentication required'): APIGatewayProxyResult {
  return apiResponse(401, {
    error: message,
  });
}

/**
 * Create a forbidden error response (403)
 */
export function forbiddenResponse(message: string = 'Access denied'): APIGatewayProxyResult {
  return apiResponse(403, {
    error: message,
  });
}

/**
 * Create a not found error response (404)
 */
export function notFoundResponse(resource: string = 'Resource'): APIGatewayProxyResult {
  return apiResponse(404, {
    error: `${resource} not found`,
  });
}

/**
 * Create an internal server error response (500)
 */
export function serverErrorResponse(message: string = 'Internal server error', error?: any): APIGatewayProxyResult {
  const response: any = {
    error: message,
  };
  
  // Include error details in development/test environments
  if (process.env.NODE_ENV !== 'production' && error) {
    response.details = error instanceof Error ? error.message : error;
  }
  
  return apiResponse(500, response);
}

/**
 * Create a service unavailable error response (503)
 */
export function serviceUnavailableResponse(service: string = 'External service'): APIGatewayProxyResult {
  return apiResponse(503, {
    error: `${service} temporarily unavailable`,
  });
}

/**
 * Create a binary response (e.g., for images, audio)
 */
export function binaryResponse(
  data: Buffer,
  contentType: string,
  statusCode: number = 200
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Content-Length': data.length.toString(),
    },
    body: data.toString('base64'),
    isBase64Encoded: true,
  };
}

