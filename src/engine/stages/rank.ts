/**
 * Stage 4: Rank
 * Per URL compute Expected Info Gain / Cost with R,F,A,D,S,C; build per-topic priority queues
 * Per requirements section 2.3.3 #4
 */

import { DiscoveryItem } from '@/types/shared';
import { RankingWeights } from '@/types/admin-settings';
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
    weights: RankingWeights,
    emitter: IEventEmitter,
    timeWindowStart?: Date,
    timeWindowEnd?: Date
  ): Promise<RankOutput> {
    await emitter.emit('rank', 0, 'Starting URL ranking');

    logger.info('Using ranking weights', weights);

    // Filter items by time window if provided
    let itemsToRank = items;
    if (timeWindowStart && timeWindowEnd) {
      const beforeFilter = items.length;
      itemsToRank = items.filter(item => {
        try {
          const pubDate = new Date(item.publishedDate);
          if (isNaN(pubDate.getTime())) {
            logger.warn('Item with invalid date in rank stage', { url: item.url });
            return false;
          }
          const inWindow = pubDate >= timeWindowStart && pubDate <= timeWindowEnd;
          if (!inWindow) {
            logger.debug('Filtering item outside time window in rank stage', {
              url: item.url,
              pubDate: pubDate.toISOString(),
              windowStart: timeWindowStart.toISOString(),
              windowEnd: timeWindowEnd.toISOString(),
            });
          }
          return inWindow;
        } catch (error) {
          logger.warn('Error parsing date in rank stage', { url: item.url, error });
          return false;
        }
      });
      
      if (beforeFilter !== itemsToRank.length) {
        logger.info('Filtered items by time window in rank stage', {
          before: beforeFilter,
          after: itemsToRank.length,
          filtered: beforeFilter - itemsToRank.length,
        });
      }
    }

    const rankedItems: RankedItem[] = [];
    const topicQueues = new Map<string, RankedItem[]>();

    for (let i = 0; i < itemsToRank.length; i++) {
      const item = itemsToRank[i];
      const pct = Math.round(((i + 1) / items.length) * 100);

      await emitter.emit('rank', pct, `Ranking ${i + 1}/${items.length}`);

      // Get actual source (extracts from title for Google News articles)
      const actualSource = this.getActualSource(item);
      
      // Update publisher field if we extracted a different source
      const updatedItem = {
        ...item,
        publisher: actualSource.publisher, // Use extracted publisher for Google News
      };

      // Compute ranking factors (R, F, A, D, S, C)
      const factors = this.computeRankingFactors(updatedItem, itemsToRank);

      // Compute Expected Info Gain from factors using admin-configured weights
      const expectedInfoGain = this.computeExpectedInfoGain(factors, weights);

      // Compute Cost
      const cost = factors.C;

      // Rank Score = Expected Info Gain / Cost
      const rankScore = cost > 0 ? expectedInfoGain / cost : 0;

      const rankedItem: RankedItem = {
        ...updatedItem,
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
   * Extract actual source from title for Google News articles
   * Example: "15 Best Amazon Holiday Home Essentials for 2025 - TODAY.com" → "TODAY.com"
   */
  private extractSourceFromTitle(title: string): string | null {
    const lastHyphenIndex = title.lastIndexOf(' - ');
    if (lastHyphenIndex === -1) {
      return null;
    }
    const source = title.substring(lastHyphenIndex + 3).trim();
    return source || null;
  }

  /**
   * Calculate domain authority for a given domain/publisher
   * Handles both formats: "Reuters" or "reuters.com"
   */
  private calculateDomainAuthority(domainOrPublisher: string): number {
    // Known high-authority publishers (both name and domain formats)
    const highAuthority = [
      'reuters', 'reuters.com',
      'bloomberg', 'bloomberg.com',
      'wsj', 'wsj.com', 'wall street journal',
      'ft', 'ft.com', 'financial times',
      'nytimes', 'nytimes.com', 'new york times',
      'theguardian', 'theguardian.com', 'guardian',
      'bbc', 'bbc.com',
      'cnn', 'cnn.com',
      'ap', 'ap.org', 'associated press',
    ];
    // Known medium-authority publishers
    const mediumAuthority = [
      'cnbc', 'cnbc.com',
      'forbes', 'forbes.com',
      'techcrunch', 'techcrunch.com',
      'theverge', 'theverge.com',
      'wired', 'wired.com',
      'time', 'time.com',
      'usatoday', 'usatoday.com', 'usa today',
      'today', 'today.com',
    ];
    
    const normalized = domainOrPublisher.toLowerCase().replace(/^www\./, '').replace(/\.com$/, '').replace(/\.org$/, '').trim();
    
    // Check if normalized matches any high-authority publisher (name or domain)
    if (highAuthority.some(pub => {
      const pubNormalized = pub.toLowerCase().replace(/\.com$/, '').replace(/\.org$/, '');
      return normalized === pubNormalized || normalized.includes(pubNormalized) || pubNormalized.includes(normalized);
    })) {
      return 0.9;
    }
    
    // Check if normalized matches any medium-authority publisher
    if (mediumAuthority.some(pub => {
      const pubNormalized = pub.toLowerCase().replace(/\.com$/, '').replace(/\.org$/, '');
      return normalized === pubNormalized || normalized.includes(pubNormalized) || pubNormalized.includes(normalized);
    })) {
      return 0.7;
    }
    
    // Default authority for unknown sources
    return 0.3;
  }

  /**
   * Get the actual domain/publisher for authority calculation
   * For Google News articles, extract source from title instead of using Google URL
   */
  private getActualSource(item: DiscoveryItem): { domain: string; publisher: string; authority: number } {
    const urlDomain = new URL(item.url).hostname;
    const isGoogleNews = urlDomain.includes('google.com') || urlDomain.includes('news.google');
    
    if (isGoogleNews && item.title) {
      // Extract source from title (words after last hyphen)
      const extractedSource = this.extractSourceFromTitle(item.title);
      if (extractedSource) {
        // Use extracted source for authority calculation
        const authority = this.calculateDomainAuthority(extractedSource);
        logger.debug('Extracted source from Google News title', {
          title: item.title,
          extractedSource,
          authority,
        });
        return {
          domain: extractedSource,
          publisher: extractedSource,
          authority,
        };
      }
    }
    
    // For non-Google articles, prefer discovery stage authority if available
    // Otherwise calculate from publisher/domain
    const publisher = item.publisher || urlDomain;
    const authority = item.scores.authority !== undefined && item.scores.authority !== null
      ? item.scores.authority
      : this.calculateDomainAuthority(publisher);
    
    return {
      domain: urlDomain,
      publisher,
      authority,
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
    // Use the publisher field (which should already be updated for Google News)
    const actualSource = this.getActualSource(item);
    const A = actualSource.authority;

    // D: Diversity - how unique is this source compared to others
    // Use actual source domain (not Google URL) for diversity calculation
    const actualDomain = actualSource.domain;
    const domainCount = allItems.filter(i => {
      const otherSource = this.getActualSource(i);
      return otherSource.domain === actualDomain;
    }).length;
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
   * Formula: weighted combination of R, F, A, D, S using admin-configured weights
   */
  private computeExpectedInfoGain(
    factors: {
      R: number;
      F: number;
      A: number;
      D: number;
      S: number;
      C: number;
    },
    weights: RankingWeights
  ): number {
    // Weighted combination using admin-configured weights
    const expectedInfoGain =
      weights.recency * factors.R +      // Recency weight
      weights.freshness * factors.F +    // Freshness weight
      weights.authority * factors.A +    // Authority weight
      weights.diversity * factors.D +    // Diversity weight
      weights.specificity * factors.S;   // Specificity weight

    return expectedInfoGain;
  }
}

