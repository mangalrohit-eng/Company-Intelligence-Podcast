/**
 * Generate interesting episode titles from script content using LLM
 * Examples: "Tesla builds a new car", "Verizon lays off 15%"
 */

export async function generateEpisodeTitle(scriptNarrative: string, openaiApiKey?: string): Promise<string> {
  if (!scriptNarrative || scriptNarrative.trim().length === 0) {
    return 'Generated Episode';
  }

  // Use LLM to generate title if API key is available
  if (openaiApiKey) {
    try {
      const { GatewayFactory } = await import('@/gateways/factory');
      
      // Create LLM gateway
      const llmGateway = GatewayFactory.createLlmGateway({
        llmProvider: 'openai',
        ttsProvider: 'stub',
        httpProvider: 'stub',
        cassetteKey: '',
        cassettePath: '',
        openaiApiKey,
      });

      // Clean up the narrative - remove opening/closing markers for better context
      let cleanedNarrative = scriptNarrative
        .replace(/\[Opening Music\]/gi, '')
        .replace(/\[Closing Music\]/gi, '')
        .replace(/\[Transition Music\]/gi, '')
        .replace(/\[Segment \d+:[^\]]+\]/gi, '')
        .replace(/^(Host|Alex|Speaker):\s*/gim, '')
        .trim();

      // Truncate if too long (keep first 2000 chars for context)
      if (cleanedNarrative.length > 2000) {
        cleanedNarrative = cleanedNarrative.substring(0, 2000) + '...';
      }

      // Generate title using LLM
      const response = await llmGateway.complete({
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating engaging, concise podcast episode titles. Generate titles that are exciting, interesting, and accurately reflect the content. Titles should be 3-6 words long and capture the most newsworthy or interesting aspect of the episode.',
          },
          {
            role: 'user',
            content: `Based on the following podcast script, generate an engaging episode title that is 3-6 words long. The title should be exciting, interesting, and accurately reflect the main content. Examples: "Tesla builds new car", "Verizon lays off 15%", "Exxon lifts force majeure", "Apple reports record earnings".

Script:
${cleanedNarrative}

Generate only the title, nothing else. Title (3-6 words):`,
          },
        ],
        temperature: 0.7,
        maxTokens: 20, // Short response for title
      });

      const title = response.content.trim();
      
      // Validate title length (3-6 words)
      const wordCount = title.split(/\s+/).length;
      if (wordCount >= 3 && wordCount <= 6) {
        return title;
      } else if (wordCount > 0 && wordCount < 10) {
        // If close, return it anyway (LLM might have added a word)
        return title;
      }
      
      // If LLM returned invalid length, fall through to fallback
    } catch (error) {
      console.error('Failed to generate title with LLM, using fallback:', error);
      // Fall through to fallback
    }
  }

  // Fallback: Simple extraction if LLM fails or no API key
  // Clean up the narrative
  let cleanedNarrative = scriptNarrative
    .replace(/\[Opening Music\]/gi, '')
    .replace(/\[Closing Music\]/gi, '')
    .replace(/\[Transition Music\]/gi, '')
    .replace(/\[Segment \d+:[^\]]+\]/gi, '')
    .replace(/^(Host|Alex|Speaker):\s*/gim, '')
    .replace(/Welcome to ["'][^"']+["'],?\s*(the podcast that|I'm your host)/gi, '')
    .trim();

  // Extract first substantive sentence
  const sentences = cleanedNarrative
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => {
      const lower = s.toLowerCase();
      return s.length > 15 &&
        !lower.match(/^(welcome|hi|hello|thanks? for|this is|i'm)/) &&
        !lower.match(/^(today|this week|in this episode|we're here)/) &&
        !lower.includes('podcast that');
    });

  if (sentences.length > 0) {
    const firstSentence = sentences[0];
    const words = firstSentence.split(/\s+/).slice(0, 6);
    const filteredWords = words.filter(w => 
      !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(w.toLowerCase())
    );
    const titleWords = filteredWords.length >= 3 
      ? filteredWords.slice(0, Math.min(6, filteredWords.length))
      : words.slice(0, Math.min(6, words.length));
    const title = titleWords.join(' ');
    return title.charAt(0).toUpperCase() + title.slice(1) || 'Generated Episode';
  }

  return 'Generated Episode';
}

/**
 * Generate episode title from script file path
 */
export async function generateEpisodeTitleFromFile(scriptFilePath: string, openaiApiKey?: string): Promise<string> {
  try {
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    const { existsSync } = await import('fs');
    
    const fullPath = join(process.cwd(), scriptFilePath);
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      console.warn(`Script file not found: ${fullPath}`);
      return 'Generated Episode';
    }
    
    const content = await readFile(fullPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Try to get narrative from various possible structures
    const narrative = parsed?.script?.narrative || 
                     parsed?.narrative || 
                     parsed?.content ||
                     '';
    
    if (!narrative || narrative.trim().length === 0) {
      console.warn('No narrative found in script file');
      return 'Generated Episode';
    }
    
    // Use OPENAI_API_KEY from environment if not provided
    const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
    
    return await generateEpisodeTitle(narrative, apiKey);
  } catch (error: any) {
    console.error('Failed to generate title from file:', error?.message || error);
    return 'Generated Episode';
  }
}

