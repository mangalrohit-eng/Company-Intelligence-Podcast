/**
 * Node Fetch HTTP Gateway - simple HTTP requests using native fetch
 */

import { IHttpGateway, HttpRequest, HttpResponse } from '../types';
import { logger } from '@/utils/logger';

export class NodeFetchHttpGateway implements IHttpGateway {
  async initialize(): Promise<void> {
    // No initialization needed
  }

  async fetch(request: HttpRequest): Promise<HttpResponse> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      // On Vercel, use shorter timeout to avoid serverless function timeouts
      // Vercel Hobby: 10s, Pro: 60s - use 8s for RSS feeds to be safe
      const defaultTimeout = process.env.VERCEL ? 8000 : 30000;
      const timeout = request.timeout || defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      logger.debug('Starting HTTP fetch', {
        url: request.url,
        timeout,
        isVercel: !!process.env.VERCEL,
      });

      // Follow redirects explicitly (fetch follows redirects by default, but be explicit)
      const response = await fetch(request.url, {
        method: request.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          ...request.headers,
        },
        body: request.body,
        signal: controller.signal,
        redirect: 'follow', // Explicitly follow redirects (default, but be explicit)
      });

      clearTimeout(timeoutId);

      const body = await response.text();
      const latencyMs = Date.now() - startTime;

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      logger.debug('Node fetch successful', {
        url: request.url,
        finalUrl: response.url, // This will show if we were redirected
        status: response.status,
        latencyMs,
        bodyLength: body.length,
        wasRedirected: response.url !== request.url,
      });

      // response.url is the final URL after redirects
      // If it's different from request.url, we were redirected
      const finalUrl = response.url || request.url;
      
      return {
        url: finalUrl, // Return final URL after redirects
        status: response.status,
        headers,
        body,
        latencyMs,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      logger.error('Node fetch failed', {
        url: request.url,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        latencyMs,
        isVercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      });

      throw new Error(`HTTP fetch failed for ${request.url}: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    // No cleanup needed
  }
}

