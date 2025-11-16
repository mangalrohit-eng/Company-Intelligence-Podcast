/**
 * Stage 4: Rank
 * Per URL compute Expected Info Gain / Cost with R,F,A,D,S,C; build per-topic priority queues
 * Per requirements section 2.3.3 #4
 */

import { DiscoveryItem } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { logger } from '@/utils/logger';

export interface RankedItem extends DiscoveryItem {
  expectedInfoGain: number;
  cost: number;
  rankScore: number; // Expected Info Gain / Cost
  rankingFactors: {
    R: number; // Recency
    F: number; // Freshness
    A: number; // Authority
    D: number; // Diversity
    S: number; // Specificity
    C: number; // Cost (fetch time estimate)
  };
}

export interface RankOutput {
  // Per-topic priority queues (sorted by rankScore descending)
  topicQueues: Map<string, RankedItem[]>;
  stats: {
    totalRanked: number;
    avgRankScore: number;
    topicCounts: Record<string, number>;
  };
}

export class RankStage {
  async execute(
    items: DiscoveryItem[],
    emitter: IEventEmitter
  ): Promise<RankOutput> {
    await emitter.emit('rank', 0, 'Starting URL ranking');

    const rankedItems: RankedItem[] = [];
    const topicQueues = new Map<string, RankedItem[]>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const pct = Math.round(((i + 1) / items.length) * 100);

      await emitter.emit('rank', pct, `Ranking ${i + 1}/${items.length}`);

      // Compute ranking factors (R, F, A, D, S, C)
      const factors = this.computeRankingFactors(item, items);

      // Compute Expected Info Gain from factors
      const expectedInfoGain = this.computeExpectedInfoGain(factors);

      // Compute Cost
      const cost = factors.C;

      // Rank Score = Expected Info Gain / Cost
      const rankScore = cost > 0 ? expectedInfoGain / cost : 0;

      const rankedItem: RankedItem = {
        ...item,
        expectedInfoGain,
        cost,
        rankScore,
        rankingFactors: factors,
      };

      rankedItems.push(rankedItem);

      // Add to per-topic priority queues
      for (const topicId of item.topicIds) {
        if (!topicQueues.has(topicId)) {
          topicQueues.set(topicId, []);
        }
        topicQueues.get(topicId)!.push(rankedItem);
      }
    }

    // Sort each topic queue by rankScore (descending)
    for (const [topicId, queue] of topicQueues.entries()) {
      queue.sort((a, b) => b.rankScore - a.rankScore);
      logger.debug('Topic queue sorted', {
        topicId,
        count: queue.length,
        topScore: queue[0]?.rankScore,
      });
    }

    // Calculate stats
    const stats = {
      totalRanked: rankedItems.length,
      avgRankScore: rankedItems.reduce((sum, item) => sum + item.rankScore, 0) / rankedItems.length,
      topicCounts: {} as Record<string, number>,
    };

    for (const [topicId, queue] of topicQueues.entries()) {
      stats.topicCounts[topicId] = queue.length;
    }

    logger.info('Rank stage complete', stats);

    await emitter.emit('rank', 100, `Ranked ${rankedItems.length} items into ${topicQueues.size} topic queues`, 'info', stats);

    return {
      topicQueues,
      stats,
    };
  }

  /**
   * Compute R, F, A, D, S, C ranking factors per requirements
   */
  private computeRankingFactors(
    item: DiscoveryItem,
    allItems: DiscoveryItem[]
  ): {
    R: number; // Recency (0-1)
    F: number; // Freshness (0-1)
    A: number; // Authority (0-1)
    D: number; // Diversity (0-1)
    S: number; // Specificity (0-1)
    C: number; // Cost (estimated seconds)
  } {
    // R: Recency - how recent is the article
    const publishTime = new Date(item.publishedDate).getTime();
    const now = Date.now();
    const ageHours = (now - publishTime) / (1000 * 60 * 60);
    const R = Math.max(0, 1 - ageHours / (24 * 7)); // Decay over 1 week

    // F: Freshness - from discovery scores
    const F = item.scores.recency;

    // A: Authority - publisher/domain authority
    const A = item.scores.authority;

    // D: Diversity - how unique is this source compared to others
    const domain = new URL(item.url).hostname;
    const domainCount = allItems.filter(i => new URL(i.url).hostname === domain).length;
    const D = Math.max(0.3, 1 - (domainCount / allItems.length) * 2); // Penalize over-represented domains

    // S: Specificity - relevance to specific topics/entities
    const S = item.scores.relevance;

    // C: Cost - estimated fetch time (in seconds)
    // Simplified: base cost + domain-specific adjustment
    const C = 2.0 + Math.random() * 3.0; // 2-5 seconds estimate

    return { R, F, A, D, S, C };
  }

  /**
   * Compute Expected Info Gain from ranking factors
   * Formula: weighted combination of R, F, A, D, S
   */
  private computeExpectedInfoGain(factors: {
    R: number;
    F: number;
    A: number;
    D: number;
    S: number;
    C: number;
  }): number {
    // Weighted combination (weights can be tuned)
    const expectedInfoGain =
      0.15 * factors.R + // Recency weight
      0.15 * factors.F + // Freshness weight
      0.25 * factors.A + // Authority weight (higher)
      0.20 * factors.D + // Diversity weight
      0.25 * factors.S;  // Specificity weight (higher)

    return expectedInfoGain;
  }
}

