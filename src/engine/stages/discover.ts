/**
 * Stage 2: Discover
 * Find news sources via RSS/APIs, pre-classify to topics/entities
 */

import { DiscoveryItem } from '@/types/shared';
import { ILlmGateway, IHttpGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';

export interface DiscoveryConfig {
  rssFeeds: string[];
  newsApis: string[];
  irUrls: string[];
  regulatorUrls: string[];
  tradePublications: string[];
}

export interface DiscoverOutput {
  items: DiscoveryItem[];
  stats: {
    totalItemsFound: number;
    itemsByTopic: Record<string, number>;
    avgLatencyMs: number;
  };
}

export class DiscoverStage {
  constructor(
    private llmGateway: ILlmGateway,
    private httpGateway: IHttpGateway
  ) {}

  async execute(
    topicIds: string[],
    companyName: string,
    sources: DiscoveryConfig,
    emitter: any,
    timeWindowStart?: Date,
    timeWindowEnd?: Date
  ): Promise<DiscoverOutput> {
    emitter.emit('discover', 0, 'Starting discovery');

    const items: DiscoveryItem[] = [];
    const latencies: number[] = [];
    
    emitter.emit('discover', 20, 'Querying news sources');

    // Parse RSS feeds
    for (const feedUrl of sources.rssFeeds) {
      const startTime = Date.now();
      try {
        logger.info('Fetching RSS feed', { feedUrl });
        const response = await this.httpGateway.fetch({ url: feedUrl, method: 'GET' });
        const latency = Date.now() - startTime;
        latencies.push(latency);
        
        logger.info('RSS feed response', { 
          feedUrl, 
          status: response.status, 
          bodyLength: response.body?.length || 0,
          latency 
        });
        
        if (response.status === 200 && response.body) {
          // Parse RSS feed (simple XML parsing)
          const matches = response.body.matchAll(/<item>[\s\S]*?<\/item>/g);
          const matchesArray = Array.from(matches);
          logger.info('RSS items found', { feedUrl, itemCount: matchesArray.length });
          
          for (const match of matchesArray) {
            const itemXml = match[0];
            const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
            const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
            const pubDateRaw = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
            const description = itemXml.match(/<description>(.*?)<\/description>/)?.[1] || itemXml.match(/<content:encoded>(.*?)<\/content:encoded>/)?.[1] || '';
            
            // Skip articles without publication date
            if (!pubDateRaw) {
              logger.debug('Skipping article without publication date', { title: title.substring(0, 100) });
              continue;
            }
            
            // Parse publication date
            let pubDate: Date;
            try {
              pubDate = new Date(pubDateRaw);
              // Validate date is valid
              if (isNaN(pubDate.getTime())) {
                logger.debug('Skipping article with invalid date', { title: title.substring(0, 100), pubDateRaw });
                continue;
              }
            } catch (error) {
              logger.debug('Skipping article with unparseable date', { title: title.substring(0, 100), pubDateRaw });
              continue;
            }
            
            // ✅ Filter by time window if provided
            if (timeWindowStart && timeWindowEnd) {
              if (pubDate < timeWindowStart || pubDate > timeWindowEnd) {
                logger.debug('Skipping article outside time window', {
                  title: title.substring(0, 100),
                  pubDate: pubDate.toISOString(),
                  windowStart: timeWindowStart.toISOString(),
                  windowEnd: timeWindowEnd.toISOString(),
                });
                continue;
              }
            }
            
            if (title && link) {
              // Simple keyword matching instead of LLM classification (faster)
              const titleLower = title.toLowerCase();
              const companyLower = companyName.toLowerCase();
              
              // ✅ Only include articles that mention the company
              if (titleLower.includes(companyLower)) {
                const relevance = 0.9;
                
                // Assign to first topic by default (will be refined in later stages)
                items.push({
                  url: link,
                  title,
                  snippet: description || title, // Use description as snippet, fallback to title
                  publisher: new URL(feedUrl).hostname,
                  publishedDate: pubDate.toISOString(),
                  topicIds: [topicIds[0] || 'company-news'],
                  entityIds: [companyName],
                  scores: {
                    relevance,
                    recency: this.calculateRecency(pubDate.toISOString()),
                    authority: 0.7,
                    expectedInfoGain: 0.5,
                  },
                });
                
                logger.debug('Relevant article found', { 
                  title: title.substring(0, 100), 
                  company: companyName,
                  publisher: new URL(feedUrl).hostname 
                });
              } else {
                logger.debug('Skipping irrelevant article', { 
                  title: title.substring(0, 100), 
                  company: companyName 
                });
              }
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch RSS feed', { feedUrl, error });
      }
    }

    // Parse News APIs
    for (const apiUrl of sources.newsApis) {
      const startTime = Date.now();
      try {
        const response = await this.httpGateway.fetch({ url: apiUrl, method: 'GET' });
        const latency = Date.now() - startTime;
        latencies.push(latency);
        
        if (response.status === 200 && response.body) {
          const data = JSON.parse(response.body);
          if (data.articles) {
            for (const article of data.articles) {
              // Skip articles without publication date
              if (!article.publishedAt) {
                logger.debug('Skipping article without publication date', { title: article.title?.substring(0, 100) });
                continue;
              }
              
              // Parse and validate publication date
              let pubDate: Date;
              try {
                pubDate = new Date(article.publishedAt);
                if (isNaN(pubDate.getTime())) {
                  logger.debug('Skipping article with invalid date', { title: article.title?.substring(0, 100) });
                  continue;
                }
              } catch (error) {
                logger.debug('Skipping article with unparseable date', { title: article.title?.substring(0, 100) });
                continue;
              }
              
              // ✅ Filter by time window if provided
              if (timeWindowStart && timeWindowEnd) {
                if (pubDate < timeWindowStart || pubDate > timeWindowEnd) {
                  logger.debug('Skipping article outside time window', {
                    title: article.title?.substring(0, 100),
                    pubDate: pubDate.toISOString(),
                    windowStart: timeWindowStart.toISOString(),
                    windowEnd: timeWindowEnd.toISOString(),
                  });
                  continue;
                }
              }
              
              const publisher = article.source?.name || 'Unknown';
              items.push({
                url: article.url,
                title: article.title,
                snippet: article.description || article.title, // Use description as snippet, fallback to title
                publisher,
                publishedDate: pubDate.toISOString(),
                topicIds: [topicIds[0]],
                entityIds: [companyName],
                scores: {
                  relevance: 0.8,
                  recency: this.calculateRecency(pubDate.toISOString()),
                  authority: publisher === 'Unknown' ? 0.3 : 0.7,
                  expectedInfoGain: 0.5,
                },
              });
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch news API', { apiUrl, error });
      }
    }

    // Handle IR URLs
    for (const irUrl of sources.irUrls) {
      const startTime = Date.now();
      try {
        await this.httpGateway.fetch({ url: irUrl, method: 'GET' });
        latencies.push(Date.now() - startTime);
      } catch (error) {
        logger.warn('Failed to fetch IR URL', { irUrl, error });
      }
    }

    emitter.emit('discover', 80, 'Pre-classifying items');

    // Calculate stats
    const itemsByTopic: Record<string, number> = {};
    for (const item of items) {
      for (const topicId of item.topicIds) {
        itemsByTopic[topicId] = (itemsByTopic[topicId] || 0) + 1;
      }
    }

    const avgLatencyMs = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    emitter.emit('discover', 100, `Discovered ${items.length} items`);

    logger.info('Discover stage complete', {
      totalItemsFound: items.length,
      itemsByTopic,
      avgLatencyMs,
    });

    return {
      items,
      stats: {
        totalItemsFound: items.length,
        itemsByTopic,
        avgLatencyMs,
      },
    };
  }

  private calculateRecency(publishedDate: string): number {
    const now = Date.now();
    const published = new Date(publishedDate).getTime();
    const ageMs = now - published;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    // Exponential decay: 1.0 for today, 0.5 for 7 days ago
    return Math.exp(-ageDays / 7);
  }
}
