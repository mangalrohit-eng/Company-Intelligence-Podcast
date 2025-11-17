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
      const timeout = request.timeout || 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(request.url, {
        method: request.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PodcastBot/1.0)',
          ...request.headers,
        },
        body: request.body,
        signal: controller.signal,
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
        status: response.status,
        latencyMs,
        bodyLength: body.length,
      });

      return {
        url: response.url,
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
        latencyMs,
      });

      throw new Error(`HTTP fetch failed for ${request.url}: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    // No cleanup needed
  }
}

