/**
 * POST /competitors/suggest - Get AI-generated competitor suggestions
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import OpenAI from 'openai';
import { logger } from '@/utils/logger';
import { badRequestResponse, successResponse, serviceUnavailableResponse } from '@/utils/api-response';
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

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Validate required environment variables
    validateEnvironment(['OPENAI_API_KEY']);
    
    const body = JSON.parse(event.body || '{}');
    const { companyName } = body;

    if (!companyName || companyName.length < 2) {
      return badRequestResponse('Company name is required (minimum 2 characters)');
    }

    // Use OpenAI to generate competitor suggestions
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4',
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

    logger.info('Generated competitor suggestions', {
      companyName,
      competitors,
      tokensUsed: completion.usage?.total_tokens,
    });

    return successResponse({
      companyName,
      competitors,
      tokensUsed: completion.usage?.total_tokens,
    });
  } catch (error: any) {
    logger.error('Failed to suggest competitors', { error });

    // Check if it's an OpenAI API error
    if (error.status === 401 || error.status === 403) {
      return serviceUnavailableResponse('OpenAI service');
    }

    return serviceUnavailableResponse('Competitor suggestion service');
  }
};

