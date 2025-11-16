/**
 * Stub LLM Gateway - returns dummy responses for testing
 */

import { ILlmGateway, LlmRequest, LlmResponse } from '../types';
import { logger } from '@/utils/logger';

export class StubLlmGateway implements ILlmGateway {
  async complete(request: LlmRequest): Promise<LlmResponse> {
    logger.debug('Stub LLM call', { messageCount: request.messages.length });

    // Generate a simple stub response based on the last user message
    const lastUserMessage = [...request.messages]
      .reverse()
      .find((m) => m.role === 'user')?.content;

    let content = 'This is a stub LLM response.';

    if (request.responseFormat === 'json_object') {
      content = JSON.stringify({
        result: 'stub response',
        input: lastUserMessage?.substring(0, 50),
      });
    }

    return {
      content,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
      latencyMs: 10,
    };
  }
}

