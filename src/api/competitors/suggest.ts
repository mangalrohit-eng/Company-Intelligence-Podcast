/**
 * POST /competitors/suggest - Get AI-generated competitor suggestions
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import OpenAI from 'openai';
import { logger } from '@/utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { companyName } = body;

    if (!companyName || companyName.length < 2) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Company name is required' }),
      };
    }

    // Use OpenAI to generate competitor suggestions
    const completion = await openai.chat.completions.create({
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        companyName,
        competitors,
        tokensUsed: completion.usage?.total_tokens,
      }),
    };
  } catch (error) {
    logger.error('Failed to suggest competitors', { error });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};

