/**
 * API Helper with automatic token injection
 */

import { fetchAuthSession } from 'aws-amplify/auth';

// Use Next.js API routes in development, AWS Lambda in production
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return '/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com';
};

// Cache auth session to avoid fetching on every request
let cachedSession: { token: string | null; timestamp: number } | null = null;
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedAuthToken(): Promise<string | null> {
  // Check cache first
  if (cachedSession && Date.now() - cachedSession.timestamp < SESSION_CACHE_TTL) {
    return cachedSession.token;
  }

  // Fetch new session
  try {
    const session = await fetchAuthSession({ forceRefresh: false });
    const token = session.tokens?.idToken?.toString() || null;
    
    // Update cache
    cachedSession = {
      token,
      timestamp: Date.now(),
    };
    
    return token;
  } catch (error) {
    cachedSession = null;
    return null;
  }
}

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
      // Use cached session to avoid fetching on every request
      const token = await getCachedAuthToken();
      
      if (token) {
        (finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      } else {
        // No token available - redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        throw new Error('No authentication token available');
      }
    } catch (error) {
      // Clear cache on error
      cachedSession = null;
      // Redirect to login on auth error
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      throw error;
    }
  }

  const API_BASE_URL = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...fetchOptions,
    headers: finalHeaders,
  });

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    // Clear cache and try to refresh the token once
    if (requireAuth) {
      cachedSession = null; // Clear cache
      try {
        const refreshedSession = await fetchAuthSession({ forceRefresh: true });
        const newToken = refreshedSession.tokens?.idToken?.toString();
        
        if (newToken) {
          // Update cache with new token
          cachedSession = {
            token: newToken,
            timestamp: Date.now(),
          };
          
          (finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
          
          // Retry the request with the new token
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            headers: finalHeaders,
          });
          
          // If retry still fails with auth error, redirect to login
          if (retryResponse.status === 401 || retryResponse.status === 403) {
            cachedSession = null;
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login';
            }
          }
          
          return retryResponse;
        } else {
          cachedSession = null;
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
      } catch (refreshError) {
        cachedSession = null;
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

