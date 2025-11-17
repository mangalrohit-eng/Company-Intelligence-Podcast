/**
 * POST /api/voice/preview - Generate TTS preview sample
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Valid OpenAI TTS voice IDs
const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type ValidVoice = typeof VALID_VOICES[number];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voiceId } = body;

    if (!voiceId) {
      return NextResponse.json(
        { error: 'Voice ID is required' },
        { status: 400 }
      );
    }

    // Validate voice ID
    if (!VALID_VOICES.includes(voiceId as any)) {
      return NextResponse.json(
        {
          error: 'Invalid voice ID',
          provided: voiceId,
          validVoices: VALID_VOICES,
        },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          message: 'Please set OPENAI_API_KEY environment variable',
        },
        { status: 503 }
      );
    }

    // Generate a short preview using OpenAI TTS
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voiceId as ValidVoice,
      input: 'Welcome to your AI-powered podcast. This is a preview of how your episodes will sound.',
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log(`✅ Generated voice preview for ${voiceId} (${buffer.length} bytes)`);

    // Return audio as MP3
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Failed to generate voice preview:', error);

    // Check if it's an OpenAI API error
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          error: 'OpenAI API authentication failed',
          message: 'Check your OPENAI_API_KEY environment variable',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate voice preview',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


