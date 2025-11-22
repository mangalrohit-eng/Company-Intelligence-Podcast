/**
 * API Helper with automatic token injection
 */

import { fetchAuthSession } from 'aws-amplify/auth';

// Use Next.js API routes (same domain as frontend)
// Since we're running in a single container, always use relative /api path
const getApiBaseUrl = () => {
  // Always use Next.js API routes (same domain as the app)
  return '/api';
};

export interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Enhanced fetch with automatic Cognito token injection
 */
export async function apiCall(endpoint: string, options: ApiOptions = {}): Promise<Response> {
  const { requireAuth = true, headers = {}, ...fetchOptions } = options;

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authentication token if required
  if (requireAuth) {
    try {
      console.log('🔐 Fetching auth session...');
      const session = await fetchAuthSession({ forceRefresh: false });
      console.log('📊 Session:', {
        hasTokens: !!session.tokens,
        hasIdToken: !!session.tokens?.idToken,
        hasAccessToken: !!session.tokens?.accessToken,
        credentials: !!session.credentials,
        identityId: session.identityId,
      });
      
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        console.log('✅ Token retrieved (length:', token.length, ')');
        console.log('✅ Token preview:', token.substring(0, 50) + '...');
        (finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      } else {
        console.error('❌ No auth token available for API call');
        console.error('❌ Full session:', JSON.stringify(session, null, 2));
        
        // No token available - redirect to login
        if (typeof window !== 'undefined') {
          console.log('🔄 Redirecting to login due to missing token');
          window.location.href = '/auth/login';
        }
        throw new Error('No authentication token available');
      }
    } catch (error) {
      console.error('❌ Failed to get auth token:', error);
      // Redirect to login on auth error
      if (typeof window !== 'undefined') {
        console.log('🔄 Redirecting to login due to auth error');
        window.location.href = '/auth/login';
      }
      throw error;
    }
  }
  
  console.log('🌐 API Call:', {
    url: endpoint,
    method: fetchOptions.method || 'GET',
    hasAuthHeader: !!(finalHeaders as Record<string, string>)['Authorization'],
  });

  const API_BASE_URL = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...fetchOptions,
    headers: finalHeaders,
  });

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    console.error('❌ Authentication failed:', response.status, response.statusText);
    
    // Try to refresh the token once
    if (requireAuth) {
      try {
        console.log('🔄 Attempting to refresh token...');
        const refreshedSession = await fetchAuthSession({ forceRefresh: true });
        const newToken = refreshedSession.tokens?.idToken?.toString();
        
        if (newToken) {
          console.log('✅ Token refreshed successfully, retrying request');
          (finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
          
          // Retry the request with the new token
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers: finalHeaders,
          });
          
          // If retry still fails with auth error, redirect to login
          if (retryResponse.status === 401 || retryResponse.status === 403) {
            console.error('❌ Auth still failed after token refresh, redirecting to login');
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login';
            }
          }
          
          return retryResponse;
        } else {
          console.error('❌ Token refresh failed, redirecting to login');
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
      } catch (refreshError) {
        console.error('❌ Token refresh error:', refreshError);
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    }
  }
  
  return response;
}

/**
 * Convenience methods
 */
export const api = {
  get: (endpoint: string, options?: ApiOptions) =>
    apiCall(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, data?: any, options?: ApiOptions) =>
    apiCall(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: (endpoint: string, data?: any, options?: ApiOptions) =>
    apiCall(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: (endpoint: string, data?: any, options?: ApiOptions) =>
    apiCall(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: (endpoint: string, options?: ApiOptions) =>
    apiCall(endpoint, { ...options, method: 'DELETE' }),
};

