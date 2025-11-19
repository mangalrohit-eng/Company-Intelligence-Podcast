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
    emitter: any
  ): Promise<DiscoverOutput> {
    logger.info('Discover stage execute() called', {
      topicCount: topicIds.length,
      companyName,
      rssFeedCount: sources.rssFeeds?.length || 0,
      newsApiCount: sources.newsApis?.length || 0,
    });
    
    emitter.emit('discover', 0, 'Starting discovery');
    logger.info('Discover stage: emitted initial event, starting RSS feed processing');

    const items: DiscoveryItem[] = [];
    const latencies: number[] = [];
    
    emitter.emit('discover', 20, 'Querying news sources');

    // Parse RSS feeds with retry logic
    for (const feedUrl of sources.rssFeeds) {
      const startTime = Date.now();
      let response: any = null;
      let lastError: any = null;
      const maxRetries = process.env.VERCEL ? 3 : 2; // More retries on Vercel due to network variability
      const timeout = process.env.VERCEL ? 15000 : 30000; // Increased to 15s on Vercel (was 8s)
      
      // Retry loop for RSS feed fetching
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info('Fetching RSS feed', { 
            feedUrl,
            attempt,
            maxRetries,
            timeout,
            isVercel: !!process.env.VERCEL,
          });
          
          response = await this.httpGateway.fetch({ 
            url: feedUrl, 
            method: 'GET',
            timeout,
          });
          
          // Success - break out of retry loop
          if (response.status === 200) {
            break;
          } else {
            logger.warn('RSS feed returned non-200 status', {
              feedUrl,
              attempt,
              status: response.status,
            });
            // If it's the last attempt, we'll handle it below
            if (attempt < maxRetries) {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
          }
        } catch (error: any) {
          lastError = error;
          const errorLatency = Date.now() - startTime;
          const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
          
          logger.warn('RSS feed fetch attempt failed', { 
            feedUrl, 
            attempt,
            maxRetries,
            error: error.message,
            errorName: error.name,
            latency: errorLatency,
            isTimeout,
            isVercel: !!process.env.VERCEL,
          });
          
          // If not the last attempt, wait and retry
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 3s
            const backoffMs = 1000 * attempt;
            logger.info('Retrying RSS feed fetch after backoff', {
              feedUrl,
              attempt,
              nextAttempt: attempt + 1,
              backoffMs,
            });
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
        }
      }
      
      // If we have a response, process it
      if (response && response.status === 200) {
        const latency = Date.now() - startTime;
        latencies.push(latency);
        
        logger.info('RSS feed response received', { 
          feedUrl, 
          status: response.status, 
          bodyLength: response.body?.length || 0,
          latency,
          contentType: response.headers?.['content-type'],
          finalUrl: response.url !== feedUrl ? response.url : undefined, // Log if redirected
          isVercel: !!process.env.VERCEL,
        });
        
        // Check for redirects or non-200 status
        if (response.status !== 200) {
          logger.warn('RSS feed returned non-200 status', {
            feedUrl,
            status: response.status,
            bodyPreview: response.body?.substring(0, 500),
            headers: response.headers,
            isVercel: !!process.env.VERCEL,
        });
        }
        
        if (response.status === 200 && response.body) {
          // Parse RSS feed (simple XML parsing)
          const bodyLength = response.body.length;
          logger.info('RSS feed body received', { 
            feedUrl, 
            bodyLength,
            bodyPreview: response.body.substring(0, 500) 
          });
          
          // Check if response is actually RSS/XML
          const isRss = response.body.includes('<rss') || response.body.includes('<?xml');
          const hasChannel = response.body.includes('<channel');
          const hasItems = response.body.includes('<item>');
          
          if (!isRss && !hasChannel) {
            logger.warn('RSS feed response does not appear to be valid RSS/XML', { 
              feedUrl,
              bodyLength,
              contentType: response.headers?.['content-type'],
              bodyStart: response.body.substring(0, 200),
              isRss,
              hasChannel,
              hasItems
            });
          }
          
          const matches = response.body.matchAll(/<item>[\s\S]*?<\/item>/g);
          const matchesArray = Array.from(matches);
          logger.info('RSS items found', { feedUrl, itemCount: matchesArray.length });
          
          if (matchesArray.length === 0) {
            logger.warn('RSS feed returned 0 items', { 
              feedUrl, 
              bodyLength,
              hasRssTag: response.body.includes('<rss'),
              hasChannelTag: response.body.includes('<channel'),
              hasItemsTag: response.body.includes('<item>'),
              contentType: response.headers?.['content-type'],
              bodySample: response.body.substring(0, 1000)
            });
          }
          
          let articlesFound = 0;
          let articlesMatched = 0;
          const articlesBeforeFeed = items.length; // Track items before processing this feed
          
          for (const match of matchesArray) {
            const itemXml = (match as RegExpMatchArray)[0];
            const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
            const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
            const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();
            
            if (title && link) {
              articlesFound++;
              
              // Simple keyword matching instead of LLM classification (faster)
              const titleLower = title.toLowerCase();
              const companyLower = companyName.toLowerCase();
              
              // Normalize company name for matching (remove common words, handle typos)
              const normalizeForMatching = (text: string) => {
                return text.toLowerCase()
                  .replace(/\s+/g, ' ')
                  .replace(/[^\w\s]/g, '')
                  .trim();
              };
              
              const normalizedTitle = normalizeForMatching(title);
              const normalizedCompany = normalizeForMatching(companyName);
              
              // More flexible matching: check if title contains company name OR key words from company name
              const companyWords = normalizedCompany.split(/\s+/).filter(w => w.length > 3); // Words longer than 3 chars
              const titleContainsCompany = normalizedTitle.includes(normalizedCompany);
              const titleContainsKeyWords = companyWords.length > 0 && 
                companyWords.some(word => normalizedTitle.includes(word));
              
              // ✅ Include articles that mention the company or key words (more lenient matching)
              const shouldInclude = titleContainsCompany || titleContainsKeyWords;
              
              if (shouldInclude) {
                articlesMatched++;
                const relevance = titleContainsCompany ? 0.9 : 0.7; // Lower relevance if only partial match
                
                // Assign to first topic by default (will be refined in later stages)
                items.push({
                  url: link,
                  title,
                  snippet: title, // Use title as snippet for now
                  publisher: new URL(feedUrl).hostname,
                  publishedDate: pubDate,
                  topicIds: [topicIds[0] || 'company-news'],
                  entityIds: [companyName],
                  scores: {
                    relevance,
                    recency: this.calculateRecency(pubDate),
                    authority: 0.7,
                    expectedInfoGain: 0.5,
                  },
                });
                
                logger.debug('Relevant article found', { 
                  title: title.substring(0, 100), 
                  company: companyName,
                  publisher: new URL(feedUrl).hostname,
                  matchType: titleContainsCompany ? 'exact' : 'partial'
                });
              } else {
                logger.debug('Skipping irrelevant article', { 
                  title: title.substring(0, 100), 
                  company: companyName,
                  normalizedTitle: normalizedTitle.substring(0, 50),
                  normalizedCompany
                });
              }
            }
          }
          
          // If this feed had articles but none matched, and we still have 0 total items,
          // include the first article as a fallback (with very low relevance)
          if (articlesFound > 0 && articlesMatched === 0 && items.length === articlesBeforeFeed) {
            const firstMatch = matchesArray[0];
            if (firstMatch) {
              const itemXml = (firstMatch as RegExpMatchArray)[0];
              const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
              const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
              const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();
              
              if (title && link) {
                logger.warn('No company matches found in RSS feed, including first article as fallback', {
                  feedUrl,
                  title: title.substring(0, 100),
                  companyName
                });
                
                items.push({
                  url: link,
                  title,
                  snippet: title, // Use title as snippet for now
                  publisher: new URL(feedUrl).hostname,
                  publishedDate: pubDate,
                  topicIds: [topicIds[0] || 'company-news'],
                  entityIds: [companyName],
                  scores: {
                    relevance: 0.3, // Very low relevance for fallback
                    recency: this.calculateRecency(pubDate),
                    authority: 0.7,
                    expectedInfoGain: 0.3,
                  },
                });
              }
            }
          }
          
          logger.info('RSS feed article filtering', {
            feedUrl,
            articlesFound,
            articlesMatched,
            companyName,
            itemsAdded: items.length
          });
        } else {
          // Response was not 200 or we don't have a response
          const errorLatency = Date.now() - startTime;
          logger.error('Failed to fetch RSS feed after all retries', { 
            feedUrl, 
            attempts: maxRetries,
            error: lastError?.message || `HTTP ${response?.status || 'no response'}`,
            errorName: lastError?.name,
            errorCode: lastError?.code,
            latency: errorLatency,
            isVercel: !!process.env.VERCEL,
            nodeEnv: process.env.NODE_ENV,
            isTimeout: lastError?.name === 'AbortError' || lastError?.message?.includes('timeout'),
          });
          
          // If timeout on Vercel, log as warning but continue
          if (process.env.VERCEL && (lastError?.name === 'AbortError' || lastError?.message?.includes('timeout'))) {
            logger.warn('RSS feed fetch timed out on Vercel after all retries', {
              feedUrl,
              timeout,
              attempts: maxRetries,
            });
          }
          
          // Continue to next feed - don't fail entire discovery
          // But log this as a critical issue if it's the only feed
          if (sources.rssFeeds.length === 1) {
            logger.error('CRITICAL: Only RSS feed failed after all retries, discovery will return 0 items', {
              feedUrl,
              error: lastError?.message || `HTTP ${response?.status || 'no response'}`,
              attempts: maxRetries,
            });
          }
        }
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
              items.push({
                url: article.url,
                title: article.title,
                snippet: article.description || article.title,
                publisher: article.source?.name || 'Unknown',
                publishedDate: article.publishedAt,
                topicIds: [topicIds[0]],
                entityIds: [companyName],
                scores: {
                  relevance: 0.8,
                  recency: this.calculateRecency(article.publishedAt),
                  authority: 0.7,
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
      rssFeedCount: sources.rssFeeds.length,
      newsApiCount: sources.newsApis.length,
    });
    
    // Log warning if no items found
    if (items.length === 0) {
      logger.error('Discover stage returned 0 items', {
        companyName,
        rssFeeds: sources.rssFeeds,
        newsApis: sources.newsApis,
        topicIds,
        avgLatencyMs,
    });
    }

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
