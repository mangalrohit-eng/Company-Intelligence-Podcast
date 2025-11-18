/**
 * Standardized authentication helper for all Lambda functions
 * Handles auth extraction and orgId auto-generation consistently
 */

export interface AuthContext {
  userId: string;
  orgId: string;
  email?: string;
}

export function extractAuth(event: any): AuthContext | null {
  const requestContext = event.requestContext as any;
  const authorizer = requestContext?.authorizer;
  
  // Extract userId from multiple possible locations
  const userId = authorizer?.claims?.sub || 
                 authorizer?.jwt?.claims?.sub || 
                 authorizer?.lambda?.sub ||
                 null;
  
  // Extract orgId from JWT (if user has it)
  let orgId = authorizer?.claims?.['custom:org_id'] || 
              authorizer?.jwt?.claims?.['custom:org_id'] ||
              authorizer?.lambda?.['custom:org_id'] ||
              null;

  // Auto-generate orgId if missing (backward compatibility for legacy users)
  if (!orgId && userId) {
    orgId = `org-${userId}`;
    console.log('[AUTH] Auto-generated orgId for legacy user:', { userId, orgId });
  }

  // Extract email for logging
  const email = authorizer?.claims?.email || 
                authorizer?.jwt?.claims?.email ||
                null;

  if (!userId || !orgId) {
    console.log('[AUTH] Authentication failed:', { 
      hasAuthorizer: !!authorizer,
      hasUserId: !!userId,
      hasOrgId: !!orgId,
      authorizerKeys: authorizer ? Object.keys(authorizer) : []
    });
    return null;
  }

  console.log('[AUTH] Authenticated:', { userId, orgId, email });
  
  return { userId, orgId, email };
}

export const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export function unauthorizedResponse() {
  return {
    statusCode: 401,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    }),
  };
}




