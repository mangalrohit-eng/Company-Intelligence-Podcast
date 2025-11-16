/**
 * Stage 7: Topic Summaries
 * 1 paragraph/topic with **exactly one** on-air stat and **one** short quote; mark [CHECK] for inferences
 * Per requirements section 2.3.3 #7
 */

import { TopicSummary, EvidenceUnit } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { ILlmGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';

export interface SummarizeOutput {
  summaries: TopicSummary[];
  stats: {
    totalTopics: number;
    totalInferences: number;
    avgInferencesPerTopic: number;
  };
}

export class SummarizeStage {
  constructor(private llmGateway: ILlmGateway) {}

  async execute(
    topicIds: string[],
    evidenceByTopic: Map<string, EvidenceUnit[]>,
    emitter: IEventEmitter
  ): Promise<SummarizeOutput> {
    await emitter.emit('summarize', 0, 'Starting topic summarization with [CHECK] marking');

    const summaries: TopicSummary[] = [];
    let totalInferences = 0;

    for (let i = 0; i < topicIds.length; i++) {
      const topicId = topicIds[i];
      const evidence = evidenceByTopic.get(topicId) || [];
      const pct = Math.round(((i + 1) / topicIds.length) * 100);

      await emitter.emit('summarize', pct, `Summarizing topic ${i + 1}/${topicIds.length}`);

      // Select EXACTLY ONE best stat and ONE best quote per requirements
      const stats = evidence.filter((e) => e.type === 'stat');
      const quotes = evidence.filter((e) => e.type === 'quote');

      if (stats.length === 0 || quotes.length === 0) {
        logger.warn('Missing stat or quote for topic', { 
          topicId, 
          statsCount: stats.length, 
          quotesCount: quotes.length 
        });
        continue;
      }

      // Pick best stat (highest authority)
      const stat = stats.sort((a, b) => b.authority - a.authority)[0];

      // Pick best quote (highest authority, prefer shorter)
      const quote = quotes.sort((a, b) => {
        const authorityDiff = b.authority - a.authority;
        if (Math.abs(authorityDiff) > 0.1) return authorityDiff;
        return a.span.length - b.span.length;
      })[0];

      // Generate summary paragraph with [CHECK] markers for inferences
      const response = await this.llmGateway.complete({
        messages: [
          {
            role: 'system',
            content: `You are a professional podcast writer.

CRITICAL REQUIREMENTS:
1. Create EXACTLY 1 paragraph
2. Include EXACTLY 1 stat (the provided stat)
3. Include EXACTLY 1 quote (the provided quote)
4. Mark ANY inference/speculation/interpretation with [CHECK]
5. Natural, engaging tone for audio

Mark [CHECK] when you:
- Draw conclusions beyond the evidence
- Make speculations
- Infer causation
- Add interpretation`,
          },
          {
            role: 'user',
            content: `Topic: ${topicId}

REQUIRED STAT: "${stat.span}"
Source: ${stat.publisher}
Context: ${stat.context}

REQUIRED QUOTE: "${quote.span}"
Source: ${quote.publisher}
Context: ${quote.context}

Write ONE engaging paragraph that naturally incorporates BOTH the stat and quote. Mark any inferences with [CHECK].`,
          },
        ],
        temperature: 0.7,
        maxTokens: 250,
      });

      // Count and extract [CHECK] markers
      const inferenceFlags: string[] = [];
      const checkMatches = response.content.matchAll(/\[CHECK:([^\]]+)\]|\[CHECK\]/g);
      for (const match of checkMatches) {
        inferenceFlags.push(match[1] || 'inference');
      }

      totalInferences += inferenceFlags.length;

      summaries.push({
        topicId,
        topicName: topicId, // In production, look up topic name
        paragraph: response.content,
        onAirStat: {
          span: stat.span,
          evidenceId: stat.id,
        },
        onAirQuote: {
          span: quote.span,
          evidenceId: quote.id,
        },
        inferenceFlags,
      });

      logger.debug('Topic summary created', {
        topicId,
        inferenceCount: inferenceFlags.length,
        statSource: stat.publisher,
        quoteSource: quote.publisher,
      });
    }

    const stats = {
      totalTopics: summaries.length,
      totalInferences,
      avgInferencesPerTopic: summaries.length > 0 ? totalInferences / summaries.length : 0,
    };

    logger.info('Summarize stage complete', {
      ...stats,
      summaryCount: summaries.length,
    });

    await emitter.emit(
      'summarize', 
      100, 
      `Generated ${summaries.length} topic summaries with ${totalInferences} inferences marked`,
      'info',
      stats
    );

    return { summaries, stats };
  }
}

