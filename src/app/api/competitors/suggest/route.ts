/**
 * API Route: Competitor Suggestions
 * POST /api/competitors/suggest - Get AI-generated competitor suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logger } from '@/utils/logger';

// Lazy initialization for better testability
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey,
    });
  }
  return openai;
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not set');
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { companyName } = body;

    if (!companyName || typeof companyName !== 'string' || companyName.length < 2) {
      return NextResponse.json(
        { error: 'Company name is required (minimum 2 characters)' },
        { status: 400 }
      );
    }

    console.log(`🤖 Generating competitor suggestions for: ${companyName}`);

    // Use OpenAI to generate competitor suggestions
    const client = getOpenAIClient();
    
    // Load admin settings to get the model preference
    let model = 'gpt-4'; // Default
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const settingsPath = path.join(process.cwd(), 'data', 'admin-settings.json');
      const settingsData = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsData);
      model = settings.models?.competitorIdentification || 'gpt-4';
      console.log(`📋 Using model: ${model} for competitor identification`);
    } catch (error) {
      // Use default if settings file doesn't exist
      console.log('⚠️ Using default model (gpt-4) - admin settings not found');
    }

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst. Given a company name, list 4-6 of its main direct competitors. Return ONLY the company names, one per line, no numbering or extra text.',
        },
        {
          role: 'user',
          content: `List the main competitors of: ${companyName}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the response to extract company names
    const competitors = responseText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.match(/^\d+\./)) // Remove numbered lines
      .map(line => line.replace(/^[-•*]\s*/, '')) // Remove bullet points
      .filter(line => line.length > 0)
      .slice(0, 6); // Max 6 competitors

    console.log(`✅ Generated ${competitors.length} competitor suggestions:`, competitors);

    return NextResponse.json({
      companyName,
      competitors,
      tokensUsed: completion.usage?.total_tokens,
    });
  } catch (error: any) {
    console.error('❌ Failed to suggest competitors:', error);

    // Check if it's an OpenAI API error
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { error: 'OpenAI API authentication failed. Please check your API key.' },
        { status: 401 }
      );
    }

    if (error.message?.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate competitor suggestions', details: error.message },
      { status: 500 }
    );
  }
}

