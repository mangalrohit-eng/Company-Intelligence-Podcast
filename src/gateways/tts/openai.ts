/**
 * OpenAI TTS Gateway Implementation
 */

import OpenAI from 'openai';
import { ITtsGateway, TtsRequest, TtsResponse } from '../types';
import { logger } from '@/utils/logger';

export class OpenAiTtsGateway implements ITtsGateway {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async synthesize(request: TtsRequest): Promise<TtsResponse> {
    const startTime = Date.now();
    const TIMEOUT_MS = 60000; // 60 second timeout for TTS calls

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`TTS API call timed out after ${TIMEOUT_MS}ms`));
        }, TIMEOUT_MS);
      });

      // Race between API call and timeout
      const response = await Promise.race([
        this.client.audio.speech.create({
          model: request.model || 'tts-1',
          voice: request.voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
          input: request.text,
          speed: request.speed || 1.0,
          response_format: request.responseFormat || 'mp3',
        }),
        timeoutPromise,
      ]);

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const latencyMs = Date.now() - startTime;

      // Estimate duration based on text length and speed (~150 words per minute at speed 1.0)
      const words = request.text.split(/\s+/).length;
      const baseWpm = 150;
      const durationSeconds = (words / baseWpm) * 60 / (request.speed || 1.0);

      logger.info('OpenAI TTS call successful', {
        voice: request.voice,
        textLength: request.text.length,
        durationSeconds,
        latencyMs,
      });

      return {
        audioBuffer,
        durationSeconds,
        latencyMs,
      };
    } catch (error) {
      logger.error('OpenAI TTS call failed', { error });
      throw error;
    }
  }
}

