/**
 * Stage 10: Script & Polish
 * Generate narrative script from outline and summaries
 */

import { Script, ThematicOutline, TopicSummary, CompetitorContrast } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { ILlmGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';

export interface ScriptOutput {
  script: Script;
  stats: {
    wordCount: number;
    estimatedDurationMinutes: number;
    bridgeCount: number;
    sectionWordCounts: Record<string, number>;
  };
}

export class ScriptStage {
  constructor(private llmGateway: ILlmGateway) {}

  async execute(
    outline: ThematicOutline,
    summaries: TopicSummary[],
    contrasts: CompetitorContrast[],
    targetDurationMinutes: number,
    emitter: IEventEmitter,
    podcastTitle?: string,
    podcastSubtitle?: string,
    podcastDescription?: string
  ): Promise<ScriptOutput> {
    await emitter.emit('script', 0, 'Starting script generation');

    const targetWords = Math.round(targetDurationMinutes * 150);

    // Build podcast context section if metadata is available
    const podcastContext = [];
    if (podcastTitle) {
      podcastContext.push(`Title: ${podcastTitle}`);
    }
    if (podcastSubtitle) {
      podcastContext.push(`Subtitle: ${podcastSubtitle}`);
    }
    if (podcastDescription) {
      podcastContext.push(`Description: ${podcastDescription}`);
    }
    const podcastContextStr = podcastContext.length > 0 
      ? `\nPodcast Context:\n${podcastContext.join('\n')}\n` 
      : '';

    // Construct context for LLM with emphasis on numbers and leadership statements
    const context = `
${podcastContextStr}Theme: ${outline.theme}
Subthemes: ${outline.subThemes.join(', ')}

Sections:
${outline.sections.map((s) => `- ${s.title}: ${s.bulletPoints.join('; ')}`).join('\n')}

Topic Summaries (PRIORITIZE numbers, metrics, and leadership statements):
${summaries.map((s) => {
  // Extract and highlight stats/quotes from summaries
  const stat = s.onAirStat?.span || '';
  const quote = s.onAirQuote?.span || '';
  return `${s.topicName}: ${s.paragraph}\n${stat ? `STAT: "${stat}"` : ''}${quote ? `\nQUOTE: "${quote}"` : ''}`;
}).join('\n\n')}

Competitor Contrasts (focus on comparative metrics and strategic implications):
${contrasts.map((c) => c.sentences.join(' ')).join('\n\n')}

IMPORTANT: Maximum length is ~${targetWords} words, but prioritize factual content. If substantive content is insufficient, write a shorter, higher-quality script. Focus on numbers, leadership statements, and business implications. Omit sections that lack substantive information rather than padding.
    `.trim();

    await emitter.emit('script', 30, 'Generating narrative script');

    // Build title reference for system prompt
    const titleReference = podcastTitle 
      ? `Use the EXACT podcast title: "${podcastTitle}"${podcastSubtitle ? ` (subtitle: "${podcastSubtitle}")` : ''} - do NOT make up a different show name`
      : 'Use appropriate business intelligence terminology';

    // Executive-focused system prompt: high density, direct, no filler, numbers-focused
    const systemPrompt = `You are a scriptwriter for a business intelligence podcast targeted at senior executives (C-suite, board members, strategic decision-makers).

CRITICAL REQUIREMENTS:
- ${titleReference}
${podcastDescription ? `- Align content with the podcast's purpose: "${podcastDescription}"` : ''}
- Write for C-suite executives: maximum information density, zero filler, zero padding
- PRIORITIZE: Numbers, metrics, percentages, financial data, leadership statements, and business implications
- ELIMINATE: Empty jargon, buzzwords, fluff phrases, conversational padding, rhetorical questions, unnecessary transitions
- QUALITY OVER QUANTITY: If there isn't enough substantive content, write a shorter script. Do NOT pad to reach target length.
- Every sentence must deliver factual information: numbers, statements, or actionable implications
- Start directly with content - no introductions, no greetings, no filler

CONTENT PRIORITIES (in order):
1. NUMBERS & METRICS: Revenue, earnings, growth percentages, market share, stock performance, headcount changes
2. LEADERSHIP STATEMENTS: Direct quotes from CEOs, CFOs, executives with attribution
3. BUSINESS IMPLICATIONS: What this means for strategy, operations, competitive position, market dynamics
4. COMPETITIVE CONTEXT: How competitors are responding or positioned relative to this news

STYLE GUIDELINES:
- Lead with the most critical number or statement
- Use active voice, strong verbs, declarative statements
- Include specific numbers, percentages, dollar amounts, dates when available
- Quote leadership statements verbatim with attribution (e.g., "CEO John Smith said...")
- Connect every piece of information to business implications immediately
- If a section lacks substantive content, omit it rather than padding
- No transitions like "moving on", "turning to", "let's look at" - just state the facts
- No "welcome to" or "thanks for listening" - start with the most important information immediately

LENGTH GUIDELINES:
- Target length is a maximum, not a requirement
- If content is insufficient, write a shorter, higher-quality script
- Better to be concise and factual than padded and vague
- Focus on delivering maximum value per word, not reaching word count`;

    const userPrompt = podcastTitle 
      ? `Write a podcast script for "${podcastTitle}"${podcastSubtitle ? ` (${podcastSubtitle})` : ''} based on the following outline and summaries. ${podcastDescription ? `The podcast's purpose: ${podcastDescription}. ` : ''}Maximum length: ~${targetWords} words (but prioritize quality - if content is insufficient, write shorter). Start directly with the most important information - no introduction.\n\nFocus on: numbers/metrics, leadership statements, and business implications. If a topic lacks substantive content, omit it rather than padding.\n\n${context}`
      : `Write a podcast script based on the following outline and summaries. Maximum length: ~${targetWords} words (but prioritize quality - if content is insufficient, write shorter).\n\nFocus on: numbers/metrics, leadership statements, and business implications. If a topic lacks substantive content, omit it rather than padding.\n\n${context}`;

    const response = await this.llmGateway.complete({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.6, // Lower temperature for more factual, focused output
      maxTokens: Math.round(targetWords * 1.5), // Allow up to target, but quality over quantity
    });

    await emitter.emit('script', 70, 'Polishing script');

    const narrative = response.content;
    const wordCount = narrative.split(/\s+/).length;
    const durationEstimateSeconds = Math.round((wordCount / 150) * 60);
    const estimatedDurationMinutes = durationEstimateSeconds / 60;

    // Count bridges (assume patterns like "moving on", "turning to", transitions)
    const bridgePatterns = /\b(moving on|turning to|next|meanwhile|however|furthermore|in addition|moreover)\b/gi;
    const bridgeCount = (narrative.match(bridgePatterns) || []).length;

    // Calculate section word counts (simplified - split by paragraphs)
    const sections = narrative.split('\n\n').filter(s => s.trim().length > 0);
    const sectionWordCounts: Record<string, number> = {};
    outline.sections.forEach((section, idx) => {
      const sectionText = sections[idx] || '';
      sectionWordCounts[section.title] = sectionText.split(/\s+/).length;
    });

    // Extract bound evidence (simplified - in real impl, track exact references)
    const boundEvidence: Record<string, string> = {};
    for (const summary of summaries) {
      boundEvidence[summary.onAirStat.evidenceId] = summary.onAirStat.span;
      boundEvidence[summary.onAirQuote.evidenceId] = summary.onAirQuote.span;
    }

    const stats = {
      wordCount,
      estimatedDurationMinutes,
      bridgeCount,
      sectionWordCounts,
    };

    logger.info('Script stage complete', stats);

    await emitter.emit('script', 100, `Script complete: ${wordCount} words`, 'info', stats);

    return {
      script: {
        narrative,
        boundEvidence,
        durationEstimateSeconds,
      },
      stats,
    };
  }
}

