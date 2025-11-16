/**
 * Stage 6: Extract Evidence Units
 * Detect numbers, ≤10-word quotes, verifiable claims with context; dedupe; update breadth/confidence
 * Per requirements section 2.3.3 #6
 */

import { EvidenceUnit } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { ILlmGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { ScrapedContent } from './scrape';

export interface ExtractOutput {
  units: EvidenceUnit[];
  stats: {
    totalUnits: number;
    byType: Record<string, number>;
    byTopic: Record<string, number>;
    dedupeRemoved: number;
  };
  breadthConfidence: Record<string, {
    breadth: number; // Unique sources per topic
    confidence: number; // Quality score based on evidence
  }>;
}

export class ExtractStage {
  constructor(private llmGateway: ILlmGateway) {}

  async execute(
    contents: ScrapedContent[],
    emitter: IEventEmitter
  ): Promise<ExtractOutput> {
    await emitter.emit('extract', 0, 'Starting evidence extraction with deduplication');

    const units: EvidenceUnit[] = [];
    const seenEvidence = new Set<string>(); // For deduplication
    let dedupeRemoved = 0;

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      const pct = Math.round(((i + 1) / contents.length) * 100);

      await emitter.emit('extract', pct, `Extracting from ${i + 1}/${contents.length} documents`);

      // Use LLM to extract structured evidence with ≤10-word quote constraint
      const response = await this.llmGateway.complete({
        messages: [
          {
            role: 'system',
            content: `You are an evidence extraction system. Extract:
1. STATS: Numbers with context (revenue, growth, market share, etc.)
2. QUOTES: Short quotes **MAXIMUM 10 WORDS** from named sources
3. CLAIMS: Verifiable factual claims

CRITICAL: Quotes MUST be ≤10 words. Truncate if longer.

Return JSON array with: {"type": "stat|quote|claim", "span": "text", "context": "surrounding text", "wordCount": number}`,
          },
          {
            role: 'user',
            content: `Extract evidence from:\n\nTitle: ${content.title}\n\nContent: ${content.content.substring(0, 5000)}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 1000,
        responseFormat: 'json_object',
      });

      try {
        const extracted = JSON.parse(response.content);
        const items = Array.isArray(extracted) ? extracted : (extracted.items || []);

        for (const item of items) {
          // Enforce ≤10-word constraint for quotes
          if (item.type === 'quote') {
            const wordCount = item.span.split(/\s+/).length;
            if (wordCount > 10) {
              // Truncate to 10 words
              item.span = item.span.split(/\s+/).slice(0, 10).join(' ') + '...';
              logger.debug('Truncated quote to 10 words', { original: item.span });
            }
          }

          // Deduplicate based on span + source
          const dedupeKey = `${item.span}::${content.url}`;
          if (seenEvidence.has(dedupeKey)) {
            dedupeRemoved++;
            continue;
          }
          seenEvidence.add(dedupeKey);

          units.push({
            id: uuidv4(),
            topicId: content.topicIds[0] || 'unknown',
            entityId: content.entityIds[0] || 'unknown',
            type: item.type,
            span: item.span,
            context: item.context || '',
            sourceUrl: content.url,
            publisher: content.publisher,
            publishedDate: content.publishedDate,
            authority: this.calculateAuthority(content.publisher),
          });
        }
      } catch (error) {
        logger.warn('Failed to parse extracted evidence', { error });
      }
    }

    // Calculate stats
    const byType: Record<string, number> = {};
    const byTopic: Record<string, number> = {};

    for (const unit of units) {
      byType[unit.type] = (byType[unit.type] || 0) + 1;
      byTopic[unit.topicId] = (byTopic[unit.topicId] || 0) + 1;
    }

    // Calculate breadth and confidence per topic
    const breadthConfidence: Record<string, {
      breadth: number;
      confidence: number;
      sources: Set<string>;
    }> = {};

    for (const unit of units) {
      if (!breadthConfidence[unit.topicId]) {
        breadthConfidence[unit.topicId] = {
          breadth: 0,
          confidence: 0,
          sources: new Set(),
        };
      }
      breadthConfidence[unit.topicId].sources.add(unit.publisher);
    }

    // Update breadth and confidence
    const outputBreadthConfidence: Record<string, {
      breadth: number;
      confidence: number;
    }> = {};

    for (const [topicId, data] of Object.entries(breadthConfidence)) {
      const breadth = data.sources.size;
      const unitCount = byTopic[topicId] || 0;
      // Confidence based on breadth, unit count, and average authority
      const topicUnits = units.filter(u => u.topicId === topicId);
      const avgAuthority = topicUnits.reduce((sum, u) => sum + u.authority, 0) / topicUnits.length;
      const confidence = Math.min(1.0, (breadth * 0.2) + (unitCount * 0.05) + (avgAuthority * 0.5));

      outputBreadthConfidence[topicId] = {
        breadth,
        confidence,
      };
    }

    const stats = {
      totalUnits: units.length,
      byType,
      byTopic,
      dedupeRemoved,
    };

    logger.info('Extract stage complete', {
      ...stats,
      avgAuthority: units.reduce((sum, u) => sum + u.authority, 0) / units.length,
    });

    await emitter.emit('extract', 100, `Extracted ${units.length} evidence units (${dedupeRemoved} duplicates removed)`, 'info', stats);

    return { 
      units, 
      stats,
      breadthConfidence: outputBreadthConfidence,
    };
  }

  /**
   * Calculate authority score based on publisher
   * In production: use publisher reputation database
   */
  private calculateAuthority(publisher: string): number {
    // Simplified: base authority with some variation
    // In production, look up publisher in authority database
    const knownHighAuthority = ['Reuters', 'Bloomberg', 'Wall Street Journal', 'Financial Times'];
    const knownMediumAuthority = ['TechCrunch', 'The Verge', 'Ars Technica'];
    
    if (knownHighAuthority.some(p => publisher.includes(p))) {
      return 0.9;
    } else if (knownMediumAuthority.some(p => publisher.includes(p))) {
      return 0.7;
    } else {
      return 0.5;
    }
  }
}

