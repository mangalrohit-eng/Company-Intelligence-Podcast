/**
 * Replay LLM Gateway - loads responses from cassettes
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ILlmGateway, LlmRequest, LlmResponse } from '../types';
import { logger } from '@/utils/logger';

export class ReplayLlmGateway implements ILlmGateway {
  private cassetteIndex = 0;
  private responses: LlmResponse[] = [];

  constructor(cassetteBasePath: string, cassetteKey: string) {
    const cassettePath = join(cassetteBasePath, cassetteKey, 'llm.json');
    try {
      const content = readFileSync(cassettePath, 'utf-8');
      this.responses = JSON.parse(content);
      logger.info(`Loaded ${this.responses.length} LLM responses from cassette`, {
        cassettePath,
      });
    } catch (error) {
      logger.warn('Failed to load LLM cassette, using empty array', { error });
      this.responses = [];
    }
  }

  async complete(_request: LlmRequest): Promise<LlmResponse> {
    if (this.cassetteIndex >= this.responses.length) {
      throw new Error(
        `Replay exhausted: requested LLM response #${this.cassetteIndex + 1}, but only ${this.responses.length} available`
      );
    }

    const response = this.responses[this.cassetteIndex];
    this.cassetteIndex++;

    logger.debug('Replaying LLM response', {
      index: this.cassetteIndex - 1,
      tokens: response.usage.totalTokens,
    });

    // Simulate latency for realism (optional)
    await new Promise((resolve) => setTimeout(resolve, 50));

    return response;
  }
}

