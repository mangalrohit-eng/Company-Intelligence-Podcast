/**
 * Replay HTTP Gateway - loads responses from cassettes
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { IHttpGateway, HttpRequest, HttpResponse } from '../types';
import { logger } from '@/utils/logger';

export class ReplayHttpGateway implements IHttpGateway {
  private responseMap: Map<string, HttpResponse> = new Map();

  constructor(cassetteBasePath: string, cassetteKey: string) {
    const cassettePath = join(cassetteBasePath, cassetteKey, 'http.json');
    try {
      const content = readFileSync(cassettePath, 'utf-8');
      const responses: Array<{ url: string; response: HttpResponse }> = JSON.parse(content);

      for (const entry of responses) {
        this.responseMap.set(entry.url, entry.response);
      }

      logger.info(`Loaded ${this.responseMap.size} HTTP responses from cassette`, {
        cassettePath,
      });
    } catch (error) {
      logger.warn('Failed to load HTTP cassette, using empty map', { error });
    }
  }

  async fetch(request: HttpRequest): Promise<HttpResponse> {
    const response = this.responseMap.get(request.url);

    if (!response) {
      throw new Error(`Replay miss: no cassette entry for URL ${request.url}`);
    }

    logger.debug('Replaying HTTP response', { url: request.url, status: response.status });

    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    return response;
  }
}

