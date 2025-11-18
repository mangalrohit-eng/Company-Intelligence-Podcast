/**
 * Utility to parse JSON from LLM responses
 * Handles markdown code blocks, extra text, and malformed JSON
 */

import { logger } from '@/utils/logger';

/**
 * Extract and parse JSON from LLM response
 * Handles:
 * - Markdown code blocks (```json ... ```)
 * - Extra text before/after JSON
 * - Trailing commas
 * - Unescaped quotes in strings
 */
export function parseLLMJson<T = any>(content: string, fallback?: T): T {
  if (!content || typeof content !== 'string') {
    if (fallback !== undefined) {
      logger.warn('Empty or invalid content, using fallback');
      return fallback;
    }
    throw new Error('Empty or invalid JSON content');
  }

  let cleaned = content.trim();

  // Step 1: Extract JSON from markdown code blocks if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
    logger.debug('Extracted JSON from markdown code block');
  }

  // Step 2: Find JSON object boundaries (first { to last })
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  } else {
    // Try to find any JSON-like structure
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
  }

  // Step 3: Fix common JSON issues
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Step 4: Try to parse
  try {
    const parsed = JSON.parse(cleaned);
    logger.debug('Successfully parsed JSON from LLM response');
    return parsed as T;
  } catch (parseError: any) {
    logger.warn('Initial JSON parse failed, attempting fixes', {
      error: parseError.message,
      contentPreview: cleaned.substring(0, 200),
    });

    // Step 5: More aggressive fixes
    try {
      // Fix unescaped quotes in string values (basic attempt)
      // This is tricky - we'll try to escape quotes that are clearly inside strings
      let fixed = cleaned;
      
      // Try to fix quotes in property values
      fixed = fixed.replace(/(":\s*")([^"]*)"([^,}\]]*)"([,}\]])/g, (match, prefix, part1, part2, suffix) => {
        // If we have unescaped quotes, try to escape them
        if (part2.includes('"') && !part2.includes('\\"')) {
          return `${prefix}${part1}\\"${part2.replace(/"/g, '\\"')}"${suffix}`;
        }
        return match;
      });

      const parsed = JSON.parse(fixed);
      logger.info('Successfully parsed JSON after fixes');
      return parsed as T;
    } catch (secondError: any) {
      logger.error('Failed to parse JSON after fixes', {
        originalError: parseError.message,
        secondError: secondError.message,
        contentLength: cleaned.length,
        contentPreview: cleaned.substring(0, 500),
        errorPosition: secondError.message.match(/position (\d+)/)?.[1],
      });

      // If fallback provided, use it
      if (fallback !== undefined) {
        logger.warn('Using fallback value due to JSON parse failure');
        return fallback;
      }

      // Try to extract partial data if possible
      throw new Error(`Failed to parse JSON: ${parseError.message}. Content preview: ${cleaned.substring(0, 200)}`);
    }
  }
}

/**
 * Parse JSON with retry and fallback structure
 */
export function parseLLMJsonWithFallback<T = any>(
  content: string,
  expectedStructure: Partial<T>,
  fieldExtractors?: Record<string, (content: string) => any>
): T {
  try {
    return parseLLMJson<T>(content);
  } catch (error) {
    logger.warn('JSON parse failed, attempting field extraction', { error });

    // Try to extract individual fields using regex if extractors provided
    if (fieldExtractors) {
      const extracted: any = { ...expectedStructure };
      for (const [field, extractor] of Object.entries(fieldExtractors)) {
        try {
          const value = extractor(content);
          if (value !== undefined && value !== null) {
            extracted[field] = value;
          }
        } catch (e) {
          logger.debug(`Failed to extract field ${field}`, { error: e });
        }
      }
      return extracted as T;
    }

    // Return expected structure as fallback
    return expectedStructure as T;
  }
}

