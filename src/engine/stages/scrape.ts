/**
 * Stage 5: Scrape
 * Polite, timeboxed; per-domain concurrency & telemetry;
 * STOP WHEN: per-topic target met with breadth/confidence OR time/fetch cap reached
 * Per requirements section 2.3.3 #5
 */

import { DiscoveryItem } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { IHttpGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  publisher: string;
  publishedDate: string;
  topicIds: string[];
  entityIds: string[];
  scrapedAt: Date;
  latencyMs: number;
}

export interface ScrapeOutput {
  contents: ScrapedContent[];
  stopReason: 'targets_met' | 'time_cap' | 'fetch_cap' | 'queue_exhausted';
  stats: {
    totalUrls: number;
    successCount: number;
    failureCount: number;
    avgLatencyMs: number;
    domainStats: Record<string, { 
      success: number; 
      failure: number;
      avgLatencyMs: number;
      lastFetchMs: number;
    }>;
  };
  perTopicProgress: Record<string, {
    fetched: number;
    target: number;
    breadth: number; // Unique sources
    confidence: number; // Quality score 0-1
  }>;
}

export class ScrapeStage {
  private readonly PER_DOMAIN_CONCURRENCY = 1; // Polite scraping
  private readonly DOMAIN_DELAY_MS = 1000; // 1 second between requests per domain
  private readonly DEFAULT_TIME_CAP_MINUTES = 30;
  private readonly DEFAULT_FETCH_CAP = 200;

  constructor(private httpGateway: IHttpGateway) {}

  async execute(
    rankedItems: DiscoveryItem[], // Ranked items with priority
    topicTargets: Record<string, { targetUnits: number }>,
    robotsMode: 'strict' | 'permissive',
    emitter: IEventEmitter,
    options?: {
      timeCapMinutes?: number;
      fetchCap?: number;
    }
  ): Promise<ScrapeOutput> {
    await emitter.emit('scrape', 0, 'Starting polite scrape with stop conditions');

    const startTime = Date.now();
    const timeCapMs = (options?.timeCapMinutes || this.DEFAULT_TIME_CAP_MINUTES) * 60 * 1000;
    const fetchCap = options?.fetchCap || this.DEFAULT_FETCH_CAP;

    const contents: ScrapedContent[] = [];
    const stats = {
      totalUrls: rankedItems.length,
      successCount: 0,
      failureCount: 0,
      avgLatencyMs: 0,
      domainStats: {} as Record<string, { 
        success: number; 
        failure: number; 
        avgLatencyMs: number;
        lastFetchMs: number;
      }>,
    };

    // Track per-topic progress for stop conditions
    const perTopicProgress: Record<string, {
      fetched: number;
      target: number;
      breadth: number;
      confidence: number;
      sources: Set<string>;
    }> = {};

    for (const [topicId, target] of Object.entries(topicTargets)) {
      perTopicProgress[topicId] = {
        fetched: 0,
        target: target.targetUnits,
        breadth: 0,
        confidence: 0,
        sources: new Set(),
      };
    }

    let stopReason: 'targets_met' | 'time_cap' | 'fetch_cap' | 'queue_exhausted' = 'queue_exhausted';

    logger.info('Starting scrape loop', {
      totalItems: rankedItems.length,
      topicCount: Object.keys(perTopicProgress).length,
      timeCapMs,
      fetchCap,
    });

    for (let i = 0; i < rankedItems.length; i++) {
      const item = rankedItems[i];

      // Check stop conditions
      if (Date.now() - startTime >= timeCapMs) {
        stopReason = 'time_cap';
        logger.info('Scrape stopping: time cap reached');
        break;
      }

      if (stats.successCount >= fetchCap) {
        stopReason = 'fetch_cap';
        logger.info('Scrape stopping: fetch cap reached');
        break;
      }

      // Check if all topics met targets with sufficient breadth/confidence
      // Only check after we've processed at least one item (to avoid false positives)
      if (i > 0 || stats.successCount > 0 || stats.failureCount > 0) {
        const allTargetsMet = this.allTopicsMetTargets(perTopicProgress);
        if (allTargetsMet) {
          stopReason = 'targets_met';
          logger.info('Scrape stopping: all topic targets met', {
            progress: perTopicProgress,
            itemsProcessed: i + 1,
          });
          break;
        }
      }

      logger.debug(`Processing item ${i + 1}/${rankedItems.length}`, { url: item.url });

      const pct = Math.round(((i + 1) / rankedItems.length) * 100);
      await emitter.emit('scrape', pct, `Scraping ${i + 1}/${rankedItems.length}`);

      try {
        const domain = new URL(item.url).hostname;

        // Per-domain rate limiting (polite scraping)
        await this.respectDomainDelay(domain, stats.domainStats);

        // Fetch content
        const fetchStart = Date.now();
        const response = await this.httpGateway.fetch({ url: item.url });
        const latencyMs = Date.now() - fetchStart;

        // Update domain stats
        if (!stats.domainStats[domain]) {
          stats.domainStats[domain] = { success: 0, failure: 0, avgLatencyMs: 0, lastFetchMs: Date.now() };
        }

        if (response.status === 200) {
          const content = this.extractTextFromHtml(response.body);

          contents.push({
            url: item.url,
            title: item.title,
            content,
            publisher: item.publisher,
            publishedDate: item.publishedDate,
            topicIds: item.topicIds,
            entityIds: item.entityIds,
            scrapedAt: new Date(),
            latencyMs,
          });

          stats.successCount++;
          stats.domainStats[domain].success++;
          stats.domainStats[domain].avgLatencyMs = 
            (stats.domainStats[domain].avgLatencyMs * (stats.domainStats[domain].success - 1) + latencyMs) / 
            stats.domainStats[domain].success;
          stats.domainStats[domain].lastFetchMs = Date.now();

          // Update per-topic progress
          for (const topicId of item.topicIds) {
            if (perTopicProgress[topicId]) {
              perTopicProgress[topicId].fetched++;
              perTopicProgress[topicId].sources.add(domain);
              perTopicProgress[topicId].breadth = perTopicProgress[topicId].sources.size;
              // Update confidence based on breadth and authority
              perTopicProgress[topicId].confidence = Math.min(1.0, 
                perTopicProgress[topicId].breadth * 0.15 + item.scores.authority * 0.5
              );
            }
          }
        } else {
          stats.failureCount++;
          stats.domainStats[domain].failure++;
        }
      } catch (error) {
        logger.warn('Scrape failed for URL', { url: item.url, error });
        stats.failureCount++;
      }
    }

    // Calculate average latency
    stats.avgLatencyMs = stats.successCount > 0
      ? Object.values(stats.domainStats).reduce((sum, d) => sum + d.avgLatencyMs * d.success, 0) / stats.successCount
      : 0;

    // Convert Set to breadth number for output
    const outputProgress: Record<string, {
      fetched: number;
      target: number;
      breadth: number;
      confidence: number;
    }> = {};

    for (const [topicId, progress] of Object.entries(perTopicProgress)) {
      outputProgress[topicId] = {
        fetched: progress.fetched,
        target: progress.target,
        breadth: progress.breadth,
        confidence: progress.confidence,
      };
    }

    // No fallback - if scraping fails, return empty results
    if (contents.length === 0) {
      logger.warn('No content scraped successfully - returning empty results', {
        totalUrls: rankedItems.length,
        failureCount: stats.failureCount,
      });
    }

    logger.info('Scrape stage complete', {
      stopReason,
      successCount: stats.successCount,
      failureCount: stats.failureCount,
      avgLatencyMs: stats.avgLatencyMs,
      domains: Object.keys(stats.domainStats).length,
    });

    await emitter.emit('scrape', 100, `Scrape complete: ${stopReason}`, 'info', { stopReason, stats });

    return { 
      contents, 
      stopReason,
      stats,
      perTopicProgress: outputProgress,
    };
  }

  /**
   * Check if all topics met their targets with sufficient breadth and confidence
   */
  private allTopicsMetTargets(progress: Record<string, {
    fetched: number;
    target: number;
    breadth: number;
    confidence: number;
  }>): boolean {
    const MIN_BREADTH = 3; // At least 3 unique sources
    const MIN_CONFIDENCE = 0.6; // At least 60% confidence

    // If no topics, don't stop (return false to continue scraping)
    const topicCount = Object.keys(progress).length;
    if (topicCount === 0) {
      logger.debug('No topics to check - continuing scrape');
      return false;
    }

    for (const topicProgress of Object.values(progress)) {
      if (topicProgress.fetched < topicProgress.target ||
          topicProgress.breadth < MIN_BREADTH ||
          topicProgress.confidence < MIN_CONFIDENCE) {
        return false;
      }
    }

    return true;
  }

  /**
   * Respect per-domain delay (polite scraping)
   */
  private async respectDomainDelay(
    domain: string,
    domainStats: Record<string, { lastFetchMs: number }>
  ): Promise<void> {
    if (domainStats[domain]?.lastFetchMs) {
      const timeSinceLastFetch = Date.now() - domainStats[domain].lastFetchMs;
      const delayNeeded = this.DOMAIN_DELAY_MS - timeSinceLastFetch;
      
      if (delayNeeded > 0) {
        await new Promise(resolve => setTimeout(resolve, delayNeeded));
      }
    }
  }

  private extractTextFromHtml(html: string): string {
    // Very basic HTML stripping - in production, use readability library
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit to 10k chars
  }
}


