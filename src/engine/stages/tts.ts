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
    const text = script.narrative;
    
    // OpenAI TTS has a 4096 character limit - chunk if needed
    const MAX_CHUNK_SIZE = 4000; // Leave some margin
    const chunks: string[] = [];
    
    if (text.length <= MAX_CHUNK_SIZE) {
      chunks.push(text);
    } else {
      // Split by sentences to avoid cutting mid-sentence
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= MAX_CHUNK_SIZE) {
          currentChunk += sentence;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = sentence;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
      
      logger.info('Script chunked for TTS', { 
        totalLength: text.length, 
        chunkCount: chunks.length 
      });
    }

    await emitter.emit('tts', 20, `Rendering ${wordCount} words in ${chunks.length} chunk(s)`);

    // Generate audio for each chunk
    const audioBuffers: Buffer[] = [];
    let totalDuration = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const progress = 20 + Math.round((i / chunks.length) * 60);
      await emitter.emit('tts', progress, `Processing chunk ${i + 1}/${chunks.length}`);
      
      try {
        logger.info('TTS chunk processing', { 
          chunkIndex: i + 1, 
          totalChunks: chunks.length,
          chunkLength: chunks[i].length,
          voice,
        });
        
        const response = await this.ttsGateway.synthesize({
          text: chunks[i],
          voice,
          speed,
          model: 'tts-1',
          responseFormat: 'mp3',
        });
        
        logger.info('TTS chunk completed', { 
          chunkIndex: i + 1,
          durationSeconds: response.durationSeconds,
          latencyMs: response.latencyMs,
        });
        
        audioBuffers.push(response.audioBuffer);
        totalDuration += response.durationSeconds;
      } catch (error: any) {
        logger.error('TTS chunk failed', { 
          chunkIndex: i + 1,
          error: error.message,
          errorType: error.constructor.name,
        });
        throw new Error(`TTS failed on chunk ${i + 1}/${chunks.length}: ${error.message}`);
      }
    }

    // Combine audio buffers
    await emitter.emit('tts', 85, 'Combining audio chunks');
    const combinedBuffer = Buffer.concat(audioBuffers);

    await emitter.emit('tts', 95, 'Audio generated, finalizing');

    logger.info('TTS stage complete', {
      durationSeconds: totalDuration,
      voice,
      speed,
      audioSizeKB: Math.round(combinedBuffer.length / 1024),
      chunkCount: chunks.length,
    });

    await emitter.emit('tts', 100, `TTS complete: ${totalDuration}s audio`, 'info', {
      durationSeconds: totalDuration,
      audioSizeKB: Math.round(combinedBuffer.length / 1024),
    });

    return {
      audioBuffer: combinedBuffer,
      durationSeconds: totalDuration,
      metadata: {
        voice,
        speed,
        wordCount,
      },
    };
  }
}

