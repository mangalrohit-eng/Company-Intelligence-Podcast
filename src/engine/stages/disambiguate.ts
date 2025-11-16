/**
 * Stage 3: Disambiguate
 * Entity linking (canonical IDs), confidence threshold (≥0.85); apply allow/block & robots
 * Per requirements section 2.3.3 #3
 */

import { DiscoveryItem } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { ILlmGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';

export interface DisambiguatedItem extends DiscoveryItem {
  canonicalEntityIds: string[]; // Canonical company/competitor IDs
  confidence: number; // Entity linking confidence (0-1)
  blocked: boolean; // True if blocked by allow/block or robots
  blockReason?: string;
}

export interface DisambiguateOutput {
  items: DisambiguatedItem[];
  stats: {
    totalInput: number;
    passedConfidenceThreshold: number; // confidence >= 0.85
    blockedByPolicy: number;
    blockedByRobots: number;
    finalCount: number;
  };
}

export class DisambiguateStage {
  private readonly CONFIDENCE_THRESHOLD = 0.85; // Per requirements

  constructor(private llmGateway: ILlmGateway) {}

  async execute(
    discoveryItems: DiscoveryItem[],
    allowDomains: string[],
    blockDomains: string[],
    robotsMode: 'strict' | 'permissive',
    emitter: IEventEmitter
  ): Promise<DisambiguateOutput> {
    await emitter.emit('disambiguate', 0, 'Starting entity disambiguation');

    const disambiguated: DisambiguatedItem[] = [];
    const stats = {
      totalInput: discoveryItems.length,
      passedConfidenceThreshold: 0,
      blockedByPolicy: 0,
      blockedByRobots: 0,
      finalCount: 0,
    };

    for (let i = 0; i < discoveryItems.length; i++) {
      const item = discoveryItems[i];
      const pct = Math.round(((i + 1) / discoveryItems.length) * 100);

      await emitter.emit(
        'disambiguate',
        pct,
        `Disambiguating ${i + 1}/${discoveryItems.length}`
      );

      // Step 1: Entity linking with LLM (in production, use entity database + embeddings)
      const confidence = await this.computeEntityConfidence(item);

      // Step 2: Check confidence threshold (≥0.85)
      if (confidence < this.CONFIDENCE_THRESHOLD) {
        logger.debug('Item below confidence threshold', {
          url: item.url,
          confidence,
          threshold: this.CONFIDENCE_THRESHOLD,
        });
        continue;
      }

      stats.passedConfidenceThreshold++;

      // Step 3: Apply allow/block domain policies
      const domain = new URL(item.url).hostname;
      let blocked = false;
      let blockReason: string | undefined;

      if (blockDomains.includes(domain)) {
        blocked = true;
        blockReason = 'blocked_domain';
        stats.blockedByPolicy++;
      } else if (allowDomains.length > 0 && !allowDomains.includes(domain)) {
        blocked = true;
        blockReason = 'not_in_allow_list';
        stats.blockedByPolicy++;
      }

      // Step 4: Check robots.txt (simplified - in production, cache robots.txt)
      if (!blocked && robotsMode === 'strict') {
        const robotsAllowed = await this.checkRobots(item.url);
        if (!robotsAllowed) {
          blocked = true;
          blockReason = 'robots_disallowed';
          stats.blockedByRobots++;
        }
      }

      if (!blocked) {
        stats.finalCount++;
      }

      // Create disambiguated item with canonical IDs
      disambiguated.push({
        ...item,
        canonicalEntityIds: item.entityIds, // In production, map to canonical IDs
        confidence,
        blocked,
        blockReason,
      });
    }

    logger.info('Disambiguate stage complete', {
      ...stats,
      avgConfidence: disambiguated.length > 0
        ? disambiguated.reduce((sum, item) => sum + item.confidence, 0) / disambiguated.length
        : 0,
    });

    await emitter.emit('disambiguate', 100, `Disambiguated: ${stats.finalCount} items passed`, 'info', stats);

    return {
      items: disambiguated,
      stats,
    };
  }

  /**
   * Compute entity linking confidence
   * In production: use entity database + embeddings + LLM
   * For now: simple heuristic based on entity match quality
   */
  private async computeEntityConfidence(item: DiscoveryItem): Promise<number> {
    // Simplified: Base confidence on scores from discovery
    const baseConfidence = item.scores.relevance * 0.8 + item.scores.authority * 0.2;
    
    // Add noise for realistic testing (in production, use actual entity linking)
    const confidence = Math.min(1.0, baseConfidence + (Math.random() * 0.15 - 0.05));
    
    return confidence;
  }

  /**
   * Check robots.txt for URL
   * In production: implement proper robots.txt caching and parsing
   */
  private async checkRobots(url: string): Promise<boolean> {
    // Simplified: in production, fetch and cache robots.txt per domain
    // For now, allow all (can be enhanced with robots-parser library)
    return true;
  }
}

