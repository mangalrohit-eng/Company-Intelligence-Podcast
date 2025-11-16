/**
 * Stage 12: TTS Render
 * Convert script to audio using OpenAI TTS
 */

import { Script } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { ITtsGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';

export interface TtsOutput {
  audioBuffer: Buffer;
  durationSeconds: number;
  metadata: {
    voice: string;
    speed: number;
    wordCount: number;
  };
}

export class TtsStage {
  constructor(private ttsGateway: ITtsGateway) {}

  async execute(
    script: Script,
    voice: string,
    speed: number,
    emitter: IEventEmitter
  ): Promise<TtsOutput> {
    await emitter.emit('tts', 0, 'Starting TTS rendering');

    const wordCount = script.narrative.split(/\s+/).length;

    await emitter.emit('tts', 30, `Rendering ${wordCount} words with voice ${voice}`);

    const response = await this.ttsGateway.synthesize({
      text: script.narrative,
      voice,
      speed,
      model: 'tts-1',
      responseFormat: 'mp3',
    });

    await emitter.emit('tts', 80, 'Audio generated, finalizing');

    logger.info('TTS stage complete', {
      durationSeconds: response.durationSeconds,
      voice,
      speed,
      audioSizeKB: Math.round(response.audioBuffer.length / 1024),
    });

    await emitter.emit('tts', 100, `TTS complete: ${response.durationSeconds}s audio`, 'info', {
      durationSeconds: response.durationSeconds,
      audioSizeKB: Math.round(response.audioBuffer.length / 1024),
    });

    return {
      audioBuffer: response.audioBuffer,
      durationSeconds: response.durationSeconds,
      metadata: {
        voice,
        speed,
        wordCount,
      },
    };
  }
}

