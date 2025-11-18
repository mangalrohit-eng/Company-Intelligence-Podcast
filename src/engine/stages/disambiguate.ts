/**
 * Stage 3: Disambiguate
 * Entity linking (canonical IDs), confidence threshold (≥0.85); apply allow/block & robots
 * Per requirements section 2.3.3 #3
 */

import 'dotenv/config'; // Load .env file explicitly
import { DiscoveryItem } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { ILlmGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';
import { getEntityVariations } from '@/utils/entity-variations';

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
  private entityVariations: Map<string, string[]> = new Map(); // Cache variations per entity

  constructor(private llmGateway: ILlmGateway) {}

  async execute(
    discoveryItems: DiscoveryItem[],
    allowDomains: string[],
    blockDomains: string[],
    robotsMode: 'strict' | 'permissive',
    emitter: IEventEmitter,
    companyName?: string,
    competitors: string[] = []
  ): Promise<DisambiguateOutput> {
    await emitter.emit('disambiguate', 0, 'Starting entity disambiguation');

    // Pre-fetch entity variations for company and competitors if provided
    if (companyName) {
      await emitter.emit('disambiguate', 5, 'Fetching company name variations');
      try {
        const companyVariations = await getEntityVariations(companyName, this.llmGateway, competitors);
        this.entityVariations.set(companyName, companyVariations);
        logger.info('Company name variations loaded', { 
          companyName, 
          variationCount: companyVariations.length,
          variations: companyVariations.slice(0, 5)
        });
      } catch (error) {
        logger.warn('Failed to fetch company variations, using original name only', { 
          companyName, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        this.entityVariations.set(companyName, [companyName]);
      }
    }

    // Fetch variations for competitors
    if (competitors.length > 0) {
      await emitter.emit('disambiguate', 8, 'Fetching competitor name variations');
      for (const competitor of competitors) {
        if (!this.entityVariations.has(competitor)) {
          try {
            const competitorVariations = await getEntityVariations(competitor, this.llmGateway, []);
            this.entityVariations.set(competitor, competitorVariations);
            logger.debug('Competitor variations loaded', { 
              competitor, 
              variationCount: competitorVariations.length 
            });
          } catch (error) {
            logger.warn('Failed to fetch competitor variations', { 
              competitor, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
            this.entityVariations.set(competitor, [competitor]);
          }
        }
      }
    }

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
      const confidence = await this.computeEntityConfidence(item, companyName, competitors);

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
   * Checks if the article mentions the company or competitors using name variations
   */
  private async computeEntityConfidence(
    item: DiscoveryItem,
    companyName?: string,
    competitors: string[] = []
  ): Promise<number> {
    // Base confidence from discovery scores
    let baseConfidence = item.scores.relevance * 0.7 + item.scores.authority * 0.3;
    
    // If we have entity variations, check if article mentions any of them
    if (companyName || competitors.length > 0) {
      const textToCheck = `${item.title} ${item.entityIds.join(' ')}`.toLowerCase();
      
      // Check company name variations
      if (companyName) {
        const companyVariations = this.entityVariations.get(companyName) || [companyName];
        const companyMentioned = companyVariations.some(variation => {
          const normalizedVariation = variation.toLowerCase().trim();
          return textToCheck.includes(normalizedVariation);
        });
        
        if (companyMentioned) {
          // Boost confidence if company is mentioned
          baseConfidence = Math.min(1.0, baseConfidence + 0.2);
          logger.debug('Company mentioned in article', {
            url: item.url,
            companyName,
            matchedVariation: companyVariations.find(v => textToCheck.includes(v.toLowerCase())),
          });
        } else {
          // Reduce confidence if company is not mentioned (but don't eliminate completely)
          baseConfidence = Math.max(0.3, baseConfidence - 0.1);
          logger.debug('Company not mentioned in article', {
            url: item.url,
            companyName,
            title: item.title.substring(0, 100),
          });
        }
      }
      
      // Check competitor mentions (less important, but can boost confidence slightly)
      if (competitors.length > 0) {
        const competitorMentioned = competitors.some(competitor => {
          const competitorVariations = this.entityVariations.get(competitor) || [competitor];
          return competitorVariations.some(variation => 
            textToCheck.includes(variation.toLowerCase().trim())
          );
        });
        
        if (competitorMentioned) {
          // Slight boost for competitor mentions (competitive intelligence)
          baseConfidence = Math.min(1.0, baseConfidence + 0.05);
        }
      }
    } else {
      // If no company name provided, use original heuristic with some noise
      baseConfidence = Math.min(1.0, baseConfidence + (Math.random() * 0.15 - 0.05));
    }
    
    return baseConfidence;
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

