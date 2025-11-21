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

  static async createHttpGateway(config: GatewayConfig): Promise<IHttpGateway> {
    // Default to 'openai' (node-fetch) if not specified or invalid
    const httpProvider = config.httpProvider || 'openai';
    
    // Log what we're using
    logger.info('Creating HTTP gateway', { 
      requestedProvider: config.httpProvider, 
      actualProvider: httpProvider,
      isVercel: !!process.env.VERCEL,
      isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
    });
    
    switch (httpProvider) {
      case 'replay':
        logger.info('Creating Replay HTTP gateway', { cassetteKey: config.cassetteKey });
        return new ReplayHttpGateway(config.cassettePath, config.cassetteKey);

      case 'openai': // Use native fetch for HTTP requests (RSS feeds, APIs, scraping)
        logger.info('Creating Node Fetch HTTP gateway');
        return new NodeFetchHttpGateway();
        
      case 'playwright': // Playwright for complex scraping with JavaScript execution
        // Try to use Playwright if available
        try {
          // Dynamic import - handle bundler transformations
          const playwrightModule = await import('./http/playwright') as any;
          
          // Try different ways to access the class (handle bundler renaming)
          let PlaywrightHttpGatewayClass = playwrightModule.PlaywrightHttpGateway || 
                                          playwrightModule.PlaywrightHttpGateway2 ||
                                          playwrightModule.default;
          
          // If still not found, search all exports
          if (!PlaywrightHttpGatewayClass) {
            const keys = Object.keys(playwrightModule);
            for (const key of keys) {
              const value = playwrightModule[key];
              if (typeof value === 'function' && 
                  key.toLowerCase().includes('playwright') && 
                  key.toLowerCase().includes('gateway')) {
                PlaywrightHttpGatewayClass = value;
                break;
              }
            }
          }
          
          if (!PlaywrightHttpGatewayClass || typeof PlaywrightHttpGatewayClass !== 'function') {
            throw new Error(`PlaywrightHttpGateway is not a constructor. Available exports: ${Object.keys(playwrightModule).join(', ')}`);
          }
          
          const gateway = new PlaywrightHttpGatewayClass();
          
          if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
            logger.info('Playwright HTTP gateway available in Lambda (using playwright-aws-lambda)');
          } else {
            logger.info('Creating Playwright HTTP gateway with stealth mode');
          }
          
          return gateway;
        } catch (error) {
          logger.warn('Playwright not available, using node-fetch instead', {
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : 'Unknown',
          });
          return new NodeFetchHttpGateway();
        }
        
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

