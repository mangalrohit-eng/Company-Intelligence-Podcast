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
// Lazy import PlaywrightHttpGateway to avoid bundling playwright in Lambda
// import { PlaywrightHttpGateway } from './http/playwright';
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
    // Default to 'openai' (node-fetch) if not specified or invalid
    const httpProvider = config.httpProvider || 'openai';
    
    // Log what we're using
    logger.info('Creating HTTP gateway', { 
      requestedProvider: config.httpProvider, 
      actualProvider: httpProvider,
      isVercel: !!process.env.VERCEL 
    });
    
    switch (httpProvider) {
      case 'replay':
        logger.info('Creating Replay HTTP gateway', { cassetteKey: config.cassetteKey });
        return new ReplayHttpGateway(config.cassettePath, config.cassetteKey);

      case 'openai': // Use native fetch for HTTP requests (RSS feeds, APIs, scraping)
        logger.info('Creating Node Fetch HTTP gateway');
        return new NodeFetchHttpGateway();
        
      case 'playwright': // Playwright for complex scraping (explicit opt-in, but not recommended)
        // Playwright requires browser binaries and is heavy - use only if absolutely necessary
        // Always use node-fetch in Lambda/Vercel environments
        if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
          logger.warn('Playwright not available on Vercel/Lambda, using node-fetch instead');
          return new NodeFetchHttpGateway();
        }
        // For local development only - PlaywrightHttpGateway not bundled in Lambda
        logger.warn('Playwright HTTP gateway requested but not available in Lambda, using node-fetch');
        return new NodeFetchHttpGateway();
        
      case 'stub': // Legacy alias - now maps to node-fetch (Playwright not needed for RSS feeds)
        logger.warn('HTTP provider "stub" is deprecated, using node-fetch (Playwright not needed for RSS feeds)');
        return new NodeFetchHttpGateway();

      default:
        // Fallback to node-fetch for unknown providers
        logger.warn(`Unknown HTTP provider "${httpProvider}", defaulting to node-fetch`);
        return new NodeFetchHttpGateway();
    }
  }
}

