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

    logger.info('Summarize stage starting', {
      topicCount: topicIds.length,
      topicIds,
      evidenceByTopicSize: evidenceByTopic.size,
      evidenceByTopicKeys: Array.from(evidenceByTopic.keys()),
      totalEvidenceUnits: Array.from(evidenceByTopic.values()).reduce((sum, units) => sum + units.length, 0),
    });

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
      const claims = evidence.filter((e) => e.type === 'claim');

      logger.info('Evidence breakdown for topic', {
        topicId,
        statsCount: stats.length,
        quotesCount: quotes.length,
        claimsCount: claims.length,
        totalEvidence: evidence.length,
        // Check if evidence has required fields
        statsWithSpan: stats.filter(s => s.span).length,
        statsWithAuthority: stats.filter(s => s.authority !== undefined && s.authority !== null).length,
        quotesWithSpan: quotes.filter(q => q.span).length,
        quotesWithAuthority: quotes.filter(q => q.authority !== undefined && q.authority !== null).length,
        // Sample evidence to see structure
        sampleStat: stats[0] ? { hasSpan: !!stats[0].span, hasAuthority: stats[0].authority !== undefined, authority: stats[0].authority } : null,
        sampleQuote: quotes[0] ? { hasSpan: !!quotes[0].span, hasAuthority: quotes[0].authority !== undefined, authority: quotes[0].authority } : null,
      });

      // More lenient: allow using claims as fallback for missing stats/quotes
      let stat = stats
        .filter(s => s.span && s.authority !== undefined)
        .sort((a, b) => b.authority - a.authority)[0];
      
      let quote = quotes
        .filter(q => q.span && q.authority !== undefined)
        .sort((a, b) => {
          const authorityDiff = b.authority - a.authority;
          if (Math.abs(authorityDiff) > 0.1) return authorityDiff;
          return (a.span?.length || 0) - (b.span?.length || 0);
        })[0];

      // Fallback: use claims if stat or quote is missing
      if (!stat && claims.length > 0) {
        logger.info('Using claim as fallback for missing stat', { topicId });
        stat = claims
          .filter(c => c.span && c.authority !== undefined)
          .sort((a, b) => b.authority - a.authority)[0];
      }

      if (!quote && claims.length > 0) {
        logger.info('Using claim as fallback for missing quote', { topicId });
        quote = claims
          .filter(c => c.span && c.authority !== undefined)
          .sort((a, b) => {
            const authorityDiff = b.authority - a.authority;
            if (Math.abs(authorityDiff) > 0.1) return authorityDiff;
            return (a.span?.length || 0) - (b.span?.length || 0);
          })[0];
      }

      if (!stat || !quote) {
        logger.warn('Missing stat or quote for topic (even after fallback)', { 
          topicId, 
          statsCount: stats.length, 
          quotesCount: quotes.length,
          claimsCount: claims.length,
          hasStat: !!stat,
          hasQuote: !!quote,
          validStatsAfterFilter: stats.filter(s => s.span && s.authority !== undefined).length,
          validQuotesAfterFilter: quotes.filter(q => q.span && q.authority !== undefined).length,
          validClaimsAfterFilter: claims.filter(c => c.span && c.authority !== undefined).length,
        });
        continue;
      }

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

