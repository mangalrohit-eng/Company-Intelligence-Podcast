/**
 * API Helper with automatic token injection
 */

import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com';

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
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        (finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('No auth token available for API call');
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
      // Continue without token - let backend handle auth error
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
    ...fetchOptions,
    headers: finalHeaders,
  });
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

  delete: (endpoint: string, options?: ApiOptions) =>
    apiCall(endpoint, { ...options, method: 'DELETE' }),
};

