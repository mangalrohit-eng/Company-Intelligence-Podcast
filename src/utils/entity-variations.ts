/**
 * Utility to get company name variations using LLM
 * Helps with disambiguation by finding common names, abbreviations, and aliases
 */

import { ILlmGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';

// Cache for entity variations to avoid repeated LLM calls
const variationsCache = new Map<string, string[]>();

/**
 * Get common name variations for a company/entity using LLM
 * Returns array of variations including abbreviations, common names, and aliases
 */
export async function getEntityVariations(
  entityName: string,
  llmGateway: ILlmGateway,
  competitors: string[] = []
): Promise<string[]> {
  // Check cache first
  const cacheKey = `${entityName}|${competitors.join(',')}`;
  if (variationsCache.has(cacheKey)) {
    logger.debug('Using cached entity variations', { entityName, variations: variationsCache.get(cacheKey) });
    return variationsCache.get(cacheKey)!;
  }

  try {
    logger.info('Fetching entity name variations from LLM', { entityName, competitors });

    // Build context for the prompt
    let context = `Entity: ${entityName}`;
    if (competitors.length > 0) {
      context += `\nRelated entities (for context): ${competitors.join(', ')}`;
    }

    const response = await llmGateway.complete({
      model: 'gpt-3.5-turbo', // Use cheaper model for this task
      messages: [
        {
          role: 'system',
          content: `You are a business intelligence assistant. Given an entity name (company, organization, league, etc.), 
return a JSON object with common name variations, abbreviations, and aliases that might be used in news articles.

Return a JSON object with this exact format:
{
  "variations": [
    "Full Name",
    "Abbreviation",
    "Common Short Name",
    "Alternative Name"
  ]
}

Include:
- The original name
- Common abbreviations (e.g., "English Premier League" -> "EPL", "Premier League")
- Shortened versions (e.g., "English Premier League" -> "Premier League")
- Common aliases or nicknames
- Variations that might appear in news headlines

Return ONLY valid JSON, no other text.`,
        },
        {
          role: 'user',
          content: `Find all common name variations for: ${context}`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      maxTokens: 500,
      responseFormat: 'json_object',
    });

    const responseText = response.content || '';
    let variations: string[] = [];

    try {
      const parsed = JSON.parse(responseText);
      if (parsed.variations && Array.isArray(parsed.variations)) {
        variations = parsed.variations
          .filter((v: any) => v && typeof v === 'string' && v.trim().length > 0)
          .map((v: string) => v.trim())
          .filter((v: string, index: number, self: string[]) => self.indexOf(v) === index); // Remove duplicates
      } else {
        logger.warn('Unexpected response format from LLM', { responseText });
        variations = [entityName]; // Fallback to original name
      }
    } catch (parseError) {
      logger.error('Failed to parse entity variations response', { responseText, error: parseError });
      variations = [entityName]; // Fallback to original name
    }

    // Always include the original name if not already present
    if (!variations.includes(entityName)) {
      variations.unshift(entityName);
    }

    // Cache the result
    variationsCache.set(cacheKey, variations);

    logger.info('Entity variations retrieved', { 
      entityName, 
      variationCount: variations.length,
      variations: variations.slice(0, 5) // Log first 5
    });

    return variations;
  } catch (error: any) {
    logger.error('Failed to get entity variations from LLM', { 
      entityName, 
      error: error.message,
      errorType: error.constructor.name 
    });
    
    // Fallback: return original name and some basic variations
    const fallbackVariations = [entityName];
    
    // Try to extract common abbreviations and variations
    const words = entityName.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length > 1) {
      // Add version without first word if it's a descriptor (e.g., "English Premier League" -> "Premier League")
      const withoutFirst = words.slice(1).join(' ');
      if (withoutFirst.length > 0 && withoutFirst !== entityName) {
        fallbackVariations.push(withoutFirst);
      }
      
      // Add version without last word if it's a descriptor
      const withoutLast = words.slice(0, -1).join(' ');
      if (withoutLast.length > 0 && withoutLast !== entityName && !fallbackVariations.includes(withoutLast)) {
        fallbackVariations.push(withoutLast);
      }
      
      // Add acronym if words are long enough (e.g., "English Premier League" -> "EPL")
      const acronym = words.map(w => w[0]?.toUpperCase()).join('');
      if (acronym.length >= 2 && acronym.length <= 6 && !fallbackVariations.includes(acronym)) {
        fallbackVariations.push(acronym);
      }
      
      // Add version with just the main words (skip common descriptors like "The", "English", etc.)
      const descriptors = new Set(['the', 'a', 'an', 'english', 'american', 'international', 'global', 'national']);
      const mainWords = words.filter(w => !descriptors.has(w.toLowerCase()));
      if (mainWords.length > 0 && mainWords.length < words.length) {
        const mainName = mainWords.join(' ');
        if (mainName !== entityName && !fallbackVariations.includes(mainName)) {
          fallbackVariations.push(mainName);
        }
      }
    }
    
    // Remove duplicates and cache fallback
    const uniqueVariations = Array.from(new Set(fallbackVariations));
    variationsCache.set(cacheKey, uniqueVariations);
    
    logger.info('Using fallback entity variations', { 
      entityName, 
      variationCount: uniqueVariations.length,
      variations: uniqueVariations 
    });
    
    return uniqueVariations;
  }
}

/**
 * Clear the variations cache (useful for testing or when entities change)
 */
export function clearVariationsCache(): void {
  variationsCache.clear();
  logger.debug('Entity variations cache cleared');
}

