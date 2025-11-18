/**
 * API Route: Topic Suggestions
 * POST /api/topics/suggest - Get AI-generated special topic suggestions
 */

import 'dotenv/config'; // Load .env file explicitly
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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
        { 
          error: 'OpenAI API key not configured',
          details: 'Please set OPENAI_API_KEY in your .env file. The app will use default topics as a fallback.',
          fallback: true
        },
        { status: 200 } // Return 200 so frontend can handle gracefully
      );
    }

    const body = await request.json();
    const { companyName, industry, competitors } = body;

    if (!companyName || typeof companyName !== 'string' || companyName.length < 2) {
      return NextResponse.json(
        { error: 'Company name is required (minimum 2 characters)' },
        { status: 400 }
      );
    }

    console.log(`🤖 Generating topic suggestions for: ${companyName}`);
    console.log(`🔑 OpenAI API Key check:`, {
      hasKey: !!process.env.OPENAI_API_KEY,
      keyLength: process.env.OPENAI_API_KEY?.length || 0,
      keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...' || 'none',
    });

    // Use OpenAI to generate topic suggestions
    let client: OpenAI;
    try {
      client = getOpenAIClient();
      console.log(`✅ OpenAI client initialized successfully`);
    } catch (clientError: any) {
      console.error('❌ Failed to initialize OpenAI client:', clientError);
      return NextResponse.json(
        { 
          error: 'Failed to initialize OpenAI client',
          details: clientError.message,
          fallback: true
        },
        { status: 200 }
      );
    }
    
    // Load admin settings to get the model preference
    // Use gpt-3.5-turbo as default (widely available and cheaper)
    let model = 'gpt-3.5-turbo'; // Default - widely available
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const settingsPath = path.join(process.cwd(), 'data', 'admin-settings.json');
      const settingsData = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsData);
      model = settings.models?.topicSuggestion || 'gpt-3.5-turbo';
      console.log(`📋 Using model from settings: ${model} for topic suggestions`);
    } catch (error) {
      // Use default if settings file doesn't exist
      console.log('⚠️ Using default model (gpt-3.5-turbo) - admin settings not found');
    }

    // Build context for the prompt
    let context = `Company: ${companyName}`;
    if (industry) {
      context += `\nIndustry: ${industry}`;
    }
    if (competitors && Array.isArray(competitors) && competitors.length > 0) {
      context += `\nCompetitors: ${competitors.join(', ')}`;
    }

    console.log(`📤 Making OpenAI API call with model: ${model}`);
    console.log(`📝 Context: ${context}`);
    
    let completion;
    try {
      completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a business intelligence analyst. Given a company name, industry, and competitors, suggest 3-5 special topics that would be relevant for a company intelligence podcast.

Return a JSON object with a "topics" array containing objects with this exact format:
{
  "topics": [
    {
      "name": "Topic Name",
      "desc": "Brief description of why this topic is relevant"
    }
  ]
}

Focus on:
- Emerging trends in the industry
- Strategic topics specific to this company and its competitors
- Technology or innovation themes
- Market dynamics and competitive landscape
- Regulatory or compliance topics if relevant

Return ONLY valid JSON, no other text.`,
          },
          {
            role: 'user',
            content: `Suggest special topics for a podcast about: ${context}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });
      console.log(`✅ OpenAI API call successful`);
    } catch (apiError: any) {
      console.error('❌ OpenAI API call failed:', apiError);
      console.error('❌ API Error details:', {
        message: apiError.message,
        status: apiError.status,
        code: apiError.code,
        type: apiError.constructor.name,
      });
      throw apiError; // Re-throw to be caught by outer catch
    }

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let topics: Array<{ name: string; desc: string }> = [];
    try {
      const parsed = JSON.parse(responseText);
      // Handle both { topics: [...] } and direct array formats
      if (Array.isArray(parsed)) {
        topics = parsed;
      } else if (parsed.topics && Array.isArray(parsed.topics)) {
        topics = parsed.topics;
      } else if (parsed.items && Array.isArray(parsed.items)) {
        topics = parsed.items;
      } else {
        console.warn('Unexpected response format:', parsed);
        topics = [];
      }
      
      // Validate and clean topics
      topics = topics
        .filter((t: any) => t && typeof t.name === 'string' && t.name.length > 0)
        .map((t: any) => ({
          name: t.name.trim(),
          desc: (t.desc || t.description || '').trim() || 'Relevant topic for this company',
        }))
        .slice(0, 5); // Max 5 topics
    } catch (error: any) {
      console.error('Failed to parse topic suggestions:', error);
      console.error('Response text:', responseText);
      // Return empty array on parse error
      topics = [];
    }

    console.log(`✅ Generated ${topics.length} topic suggestions:`, topics.map(t => t.name));

    return NextResponse.json({
      companyName,
      topics,
      tokensUsed: completion.usage?.total_tokens,
    });
  } catch (error: any) {
    console.error('❌ Failed to suggest topics:', error);
    console.error('❌ Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      code: error.code,
      type: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });

    // Check if it's an OpenAI API error
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { 
          error: 'OpenAI API authentication failed. Please check your API key.',
          details: error.message,
          fallback: true
        },
        { status: 200 } // Return 200 so frontend can handle gracefully
      );
    }

    if (error.message?.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { 
          error: error.message,
          fallback: true
        },
        { status: 200 } // Return 200 so frontend can handle gracefully
      );
    }

    // Check for rate limiting or quota errors
    if (error.status === 429) {
      return NextResponse.json(
        { 
          error: 'OpenAI API rate limit exceeded. Please try again later.',
          details: error.message,
          fallback: true
        },
        { status: 200 }
      );
    }

    // Check for model availability errors
    if (error.message?.includes('model') || error.code === 'model_not_found') {
      return NextResponse.json(
        { 
          error: 'OpenAI model not available. Please check your model configuration.',
          details: error.message,
          fallback: true
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate topic suggestions',
        details: error.message || 'Unknown error occurred',
        errorType: error.constructor.name,
        fallback: true
      },
      { status: 200 } // Return 200 so frontend can handle gracefully
    );
  }
}

