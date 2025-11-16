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
    emitter: IEventEmitter
  ): Promise<ScriptOutput> {
    await emitter.emit('script', 0, 'Starting script generation');

    const targetWords = Math.round(targetDurationMinutes * 150);

    // Construct context for LLM
    const context = `
Theme: ${outline.theme}
Subthemes: ${outline.subThemes.join(', ')}

Sections:
${outline.sections.map((s) => `- ${s.title}: ${s.bulletPoints.join('; ')}`).join('\n')}

Topic Summaries:
${summaries.map((s) => `${s.topicName}: ${s.paragraph}`).join('\n\n')}

Competitor Contrasts:
${contrasts.map((c) => c.sentences.join(' ')).join('\n\n')}

Target length: ~${targetWords} words
    `.trim();

    await emitter.emit('script', 30, 'Generating narrative script');

    const response = await this.llmGateway.complete({
      messages: [
        {
          role: 'system',
          content: `You are a professional podcast scriptwriter. Create an engaging, thematic narrative that flows naturally between topics. Use conversational language, smooth transitions, and maintain the listener's interest. Incorporate the provided summaries and contrasts seamlessly.`,
        },
        {
          role: 'user',
          content: `Write a podcast script based on the following outline and summaries. Target length: ~${targetWords} words.\n\n${context}`,
        },
      ],
      temperature: 0.8,
      maxTokens: Math.round(targetWords * 1.5),
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

