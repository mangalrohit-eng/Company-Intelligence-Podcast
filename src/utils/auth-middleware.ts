/**
 * Authentication Middleware
 * Centralized authentication context extraction and validation
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from './logger';

/**
 * Authenticated user context
 */
export interface AuthContext {
  userId: string;
  orgId: string;
  isLegacyUser: boolean;
  email?: string;
  username?: string;
}

/**
 * Extract authentication context from API Gateway event
 * Handles both Cognito JWT tokens and Lambda authorizer formats
 * 
 * @param event API Gateway proxy event
 * @returns AuthContext if authenticated, null otherwise
 */
export function extractAuthContext(event: APIGatewayProxyEvent): AuthContext | null {
  const requestContext = event.requestContext as any;
  const authorizer = requestContext?.authorizer;
  
  // Log auth structure for debugging (only keys, not values)
  logger.debug('Auth context extraction', {
    hasAuthorizer: !!authorizer,
    authorizerKeys: authorizer ? Object.keys(authorizer) : [],
    hasRequestContext: !!requestContext,
  });
  
  // Try to extract user ID from various auth structures
  const userId = authorizer?.claims?.sub || 
                 authorizer?.jwt?.claims?.sub || 
                 authorizer?.lambda?.sub ||
                 null;
  
  if (!userId) {
    logger.warn('No user ID found in auth context', {
      hasAuthorizer: !!authorizer,
      path: event.path,
      httpMethod: event.httpMethod,
    });
    return null;
  }
  
  // Try to extract org ID
  let orgId = authorizer?.claims?.['custom:org_id'] || 
              authorizer?.jwt?.claims?.['custom:org_id'] ||
              authorizer?.lambda?.['custom:org_id'] ||
              null;
  
  // Handle legacy users without org_id
  const isLegacyUser = !orgId;
  if (isLegacyUser) {
    // Auto-generate org_id for backward compatibility
    orgId = `org-${userId}`;
    logger.warn('Legacy user detected - auto-generated org_id', {
      userId: userId.substring(0, 8) + '...',
      generatedOrgId: orgId.substring(0, 12) + '...',
      path: event.path,
    });
  }
  
  // Extract additional user info if available
  const email = authorizer?.claims?.email || 
                authorizer?.jwt?.claims?.email ||
                undefined;
  
  const username = authorizer?.claims?.['cognito:username'] || 
                   authorizer?.jwt?.claims?.['cognito:username'] ||
                   undefined;
  
  logger.info('Auth context extracted', {
    userId: userId.substring(0, 8) + '...',
    orgId: orgId.substring(0, 12) + '...',
    isLegacyUser,
    hasEmail: !!email,
    hasUsername: !!username,
  });
  
  return {
    userId,
    orgId,
    isLegacyUser,
    email,
    username,
  };
}

/**
 * Require authentication for a request
 * Returns auth context or throws with appropriate error response
 * 
 * @param event API Gateway proxy event
 * @returns AuthContext
 * @throws Object with statusCode and body for unauthorized response
 */
export function requireAuth(event: APIGatewayProxyEvent): AuthContext {
  const auth = extractAuthContext(event);
  
  if (!auth) {
    logger.warn('Authentication required but not provided', {
      path: event.path,
      httpMethod: event.httpMethod,
      sourceIp: event.requestContext?.identity?.sourceIp,
    });
    
    throw {
      statusCode: 401,
      body: JSON.stringify({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      }),
    };
  }
  
  return auth;
}

/**
 * Validate environment variables are set
 * Throws early with clear error if required env vars are missing
 * 
 * @param required Array of required environment variable names
 * @throws Error with missing variable names
 */
export function validateEnvironment(required: string[]): void {
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error('Environment validation failed', { missing });
    throw new Error(error);
  }
  
  logger.debug('Environment validation passed', {
    validated: required.length,
  });
}

/**
 * Check if user has access to resource based on org ownership
 * 
 * @param auth User auth context
 * @param resourceOrgId Org ID of the resource being accessed
 * @returns true if user has access, false otherwise
 */
export function hasOrgAccess(auth: AuthContext, resourceOrgId: string): boolean {
  const hasAccess = auth.orgId === resourceOrgId;
  
  if (!hasAccess) {
    logger.warn('Org access denied', {
      userOrgId: auth.orgId.substring(0, 12) + '...',
      resourceOrgId: resourceOrgId.substring(0, 12) + '...',
      userId: auth.userId.substring(0, 8) + '...',
    });
  }
  
  return hasAccess;
}

