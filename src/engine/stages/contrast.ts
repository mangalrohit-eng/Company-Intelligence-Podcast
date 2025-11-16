/**
 * Stage 8: Competitor Contrasts
 * Per topic, 1–2 sentences contrasting company vs competitors with a bound stat/quote
 * Per requirements section 2.3.3 #8
 */

import { EvidenceUnit, CompetitorContrast } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { ILlmGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';

export interface ContrastOutput {
  contrasts: CompetitorContrast[];
  stats: {
    totalContrasts: number;
    byTopic: Record<string, number>;
  };
}

export class ContrastStage {
  constructor(private llmGateway: ILlmGateway) {}

  async execute(
    topicIds: string[],
    evidenceByTopic: Map<string, EvidenceUnit[]>,
    companyName: string,
    competitors: string[],
    emitter: IEventEmitter
  ): Promise<ContrastOutput> {
    await emitter.emit('contrast', 0, 'Generating competitor contrasts');

    const contrasts: CompetitorContrast[] = [];
    const byTopic: Record<string, number> = {};

    for (let i = 0; i < topicIds.length; i++) {
      const topicId = topicIds[i];
      const evidence = evidenceByTopic.get(topicId) || [];
      const pct = Math.round(((i + 1) / topicIds.length) * 100);

      await emitter.emit('contrast', pct, `Creating contrasts for topic ${i + 1}/${topicIds.length}`);

      // Filter evidence related to company and competitors
      // Be lenient - use any evidence if specific matches not found
      const companyEvidence = evidence.filter((e) =>
        e.context.toLowerCase().includes(companyName.toLowerCase()) ||
        e.span.toLowerCase().includes(companyName.toLowerCase())
      );

      const competitorEvidence = evidence.filter((e) =>
        competitors.some((comp) => 
          e.context.toLowerCase().includes(comp.toLowerCase()) ||
          e.span.toLowerCase().includes(comp.toLowerCase())
        )
      );

      // If no specific evidence, use all available evidence for this topic
      const relevantEvidence = (companyEvidence.length > 0 || competitorEvidence.length > 0)
        ? [...companyEvidence, ...competitorEvidence]
        : evidence;

      if (relevantEvidence.length === 0) {
        logger.debug('No evidence for topic', { topicId });
        continue;
      }

      // Select best stat or quote for contrast
      const bestEvidence = relevantEvidence
        .filter((e) => e.type === 'stat' || e.type === 'quote')
        .sort((a, b) => b.authority - a.authority)[0];

      if (!bestEvidence) {
        continue;
      }

      // Generate 1-2 sentence contrast using LLM
      const evidenceText = relevantEvidence
        .map((e) => `${e.type.toUpperCase()}: "${e.span}" [${e.publisher}]`)
        .join('\n');

      const response = await this.llmGateway.complete({
        messages: [
          {
            role: 'system',
            content: `You are a podcast writer creating competitor analysis.

REQUIREMENTS:
1. Write 1-2 sentences ONLY
2. Contrast ${companyName} vs competitors
3. Include the provided bound stat/quote
4. Make it engaging and factual

Format: Natural, insightful comparison for audio.`,
          },
          {
            role: 'user',
            content: `Topic: ${topicId}
Company: ${companyName}
Competitors: ${competitors.join(', ')}

BOUND EVIDENCE: "${bestEvidence.span}" [${bestEvidence.publisher}]

Available Evidence:
${evidenceText}

Write 1-2 sentences contrasting ${companyName} vs competitors, incorporating the bound evidence.`,
          },
        ],
        temperature: 0.7,
        maxTokens: 150,
      });

      // Split sentences (assume . as delimiter)
      const sentenceArray = response.content.split('. ').filter((s: string) => s.trim().length > 0);
      
      contrasts.push({
        topicId,
        sentences: sentenceArray,
        boundStatOrQuote: {
          span: bestEvidence.span,
          evidenceId: bestEvidence.id,
        },
      });

      byTopic[topicId] = (byTopic[topicId] || 0) + 1;

      logger.debug('Competitor contrast created', {
        topicId,
        boundEvidenceType: bestEvidence.type,
        evidenceSource: bestEvidence.publisher,
      });
    }

    const stats = {
      totalContrasts: contrasts.length,
      byTopic,
    };

    logger.info('Contrast stage complete', stats);

    await emitter.emit(
      'contrast',
      100,
      `Generated ${contrasts.length} competitor contrasts`,
      'info',
      stats
    );

    return { contrasts, stats };
  }
}

