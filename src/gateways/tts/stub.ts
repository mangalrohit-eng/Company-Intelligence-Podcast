/**
 * Stub TTS Gateway - returns silent audio for testing
 */

import { ITtsGateway, TtsRequest, TtsResponse } from '../types';
import { logger } from '@/utils/logger';

export class StubTtsGateway implements ITtsGateway {
  async synthesize(request: TtsRequest): Promise<TtsResponse> {
    logger.debug('Stub TTS call', { textLength: request.text.length });

    // Create a minimal valid MP3 header (silent audio)
    // This is a very minimal MP3 frame for testing purposes
    const silentMp3Header = Buffer.from([
      0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ]);

    // Estimate duration based on text
    const words = request.text.split(/\s+/).length;
    const baseWpm = 150;
    const durationSeconds = (words / baseWpm) * 60 / (request.speed || 1.0);

    return {
      audioBuffer: silentMp3Header,
      durationSeconds,
      latencyMs: 5,
    };
  }
}

