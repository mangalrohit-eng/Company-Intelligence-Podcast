/**
 * POST /voice/preview - Generate TTS preview sample
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import OpenAI from 'openai';
import { logger } from '@/utils/logger';
import { badRequestResponse, binaryResponse, serviceUnavailableResponse } from '@/utils/api-response';
import { validateEnvironment } from '@/utils/auth-middleware';

// Lazy initialization for better testability
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Valid OpenAI TTS voice IDs
const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type ValidVoice = typeof VALID_VOICES[number];

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Validate required environment variables
    validateEnvironment(['OPENAI_API_KEY']);
    
    const body = JSON.parse(event.body || '{}');
    const { voiceId } = body;

    if (!voiceId) {
      return badRequestResponse('Voice ID is required');
    }

    // Validate voice ID
    if (!VALID_VOICES.includes(voiceId as any)) {
      return badRequestResponse('Invalid voice ID', {
        provided: voiceId,
        validVoices: VALID_VOICES,
      });
    }

    // Generate a short preview using OpenAI TTS
    const client = getOpenAIClient();
    const mp3 = await client.audio.speech.create({
      model: 'tts-1',
      voice: voiceId as ValidVoice,
      input: 'Welcome to your AI-powered podcast. This is a preview of how your episodes will sound.',
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    logger.info('Generated voice preview', {
      voiceId,
      audioSize: buffer.length,
    });

    return binaryResponse(buffer, 'audio/mpeg');
  } catch (error: any) {
    logger.error('Failed to generate voice preview', { error });

    // Check if it's an OpenAI API error
    if (error.status === 401 || error.status === 403) {
      return serviceUnavailableResponse('OpenAI TTS service');
    }

    return serviceUnavailableResponse('Voice preview generation');
  }
};

