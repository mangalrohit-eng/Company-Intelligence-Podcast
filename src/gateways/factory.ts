/**
 * Gateway Factory - creates gateways based on provider configuration
 */

import { ILlmGateway, ITtsGateway, IHttpGateway, GatewayConfig } from './types';
import { OpenAiLlmGateway } from './llm/openai';
import { ReplayLlmGateway } from './llm/replay';
import { StubLlmGateway } from './llm/stub';
import { OpenAiTtsGateway } from './tts/openai';
import { StubTtsGateway } from './tts/stub';
import { ReplayHttpGateway } from './http/replay';
import { PlaywrightHttpGateway } from './http/playwright';
import { NodeFetchHttpGateway } from './http/node-fetch';
import { logger } from '@/utils/logger';

export class GatewayFactory {
  static createLlmGateway(config: GatewayConfig): ILlmGateway {
    switch (config.llmProvider) {
      case 'openai':
        if (!config.openaiApiKey) {
          throw new Error('OpenAI API key required for llmProvider=openai');
        }
        logger.info('Creating OpenAI LLM gateway');
        return new OpenAiLlmGateway(config.openaiApiKey);

      case 'replay':
        logger.info('Creating Replay LLM gateway', { cassetteKey: config.cassetteKey });
        return new ReplayLlmGateway(config.cassettePath, config.cassetteKey);

      case 'stub':
        logger.info('Creating Stub LLM gateway');
        return new StubLlmGateway();

      default:
        throw new Error(`Unknown LLM provider: ${config.llmProvider}`);
    }
  }

  static createTtsGateway(config: GatewayConfig): ITtsGateway {
    switch (config.ttsProvider) {
      case 'openai':
        if (!config.openaiApiKey) {
          throw new Error('OpenAI API key required for ttsProvider=openai');
        }
        logger.info('Creating OpenAI TTS gateway');
        return new OpenAiTtsGateway(config.openaiApiKey);

      case 'stub':
        logger.info('Creating Stub TTS gateway');
        return new StubTtsGateway();

      case 'replay':
        // TTS replay would need cassette support (not implemented yet)
        logger.warn('TTS replay not fully implemented, falling back to stub');
        return new StubTtsGateway();

      default:
        throw new Error(`Unknown TTS provider: ${config.ttsProvider}`);
    }
  }

  static createHttpGateway(config: GatewayConfig): IHttpGateway {
    switch (config.httpProvider) {
      case 'replay':
        logger.info('Creating Replay HTTP gateway', { cassetteKey: config.cassetteKey });
        return new ReplayHttpGateway(config.cassettePath, config.cassetteKey);

      case 'openai': // Use simple fetch for RSS/API requests
        logger.info('Creating Node Fetch HTTP gateway');
        return new NodeFetchHttpGateway();
        
      case 'stub': // Playwright for complex scraping
        logger.info('Creating Playwright HTTP gateway');
        return new PlaywrightHttpGateway();

      default:
        throw new Error(`Unknown HTTP provider: ${config.httpProvider}`);
    }
  }
}

