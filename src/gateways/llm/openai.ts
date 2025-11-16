/**
 * OpenAI LLM Gateway Implementation
 */

import OpenAI from 'openai';
import { ILlmGateway, LlmRequest, LlmResponse } from '../types';
import { logger } from '@/utils/logger';

export class OpenAiLlmGateway implements ILlmGateway {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const startTime = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
        model: request.model || 'gpt-4-turbo-preview',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        response_format:
          request.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
      });

      const latencyMs = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '';

      const response: LlmResponse = {
        content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        latencyMs,
      };

      logger.info('OpenAI LLM call successful', {
        model: request.model,
        tokens: response.usage.totalTokens,
        latencyMs,
      });

      return response;
    } catch (error) {
      logger.error('OpenAI LLM call failed', { error });
      throw error;
    }
  }
}

