/**
 * Unit tests for Stage 2: Discover
 * Tests RSS/news APIs, IR, regulators, trades, pre-classification
 */

import { DiscoverStage } from '../../src/engine/stages/discover';

describe('Stage 2: Discover', () => {
  let stage: DiscoverStage;
  let mockLlmGateway: any;
  let mockHttpGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockLlmGateway = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          relevance: 0.9,
          topics: ['topic1'],
        }),
      }),
    };
    mockHttpGateway = {
      fetch: jest.fn().mockResolvedValue({
        status: 200,
        body: `<?xml version="1.0"?>
          <rss version="2.0">
            <channel>
              <item>
                <title>Test Article</title>
                <link>https://example.com/article</link>
                <pubDate>Mon, 16 Nov 2025 00:00:00 GMT</pubDate>
                <description>Test description</description>
              </item>
            </channel>
          </rss>`,
      }),
    };
    stage = new DiscoverStage(mockLlmGateway, mockHttpGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Source Discovery', () => {
    it('should discover items from RSS feeds', async () => {
      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should discover items from news APIs', async () => {
      mockHttpGateway.fetch.mockResolvedValue({
        status: 200,
        body: JSON.stringify({
          articles: [
            {
              title: 'News Article',
              url: 'https://news.com/article',
              publishedAt: '2025-11-16T00:00:00Z',
              source: { name: 'News Source' },
            },
          ],
        }),
      });

      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: [],
          newsApis: ['https://newsapi.org'],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should discover items from IR sites', async () => {
      mockHttpGateway.fetch.mockResolvedValue({
        status: 200,
        body: '<html><body><h1>Investor Relations</h1><a href="/press-release">Press Release</a></body></html>',
      });

      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: [],
          newsApis: [],
          irUrls: ['https://company.com/investor-relations'],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      expect(mockHttpGateway.fetch).toHaveBeenCalled();
    });
  });

  describe('Pre-Classification', () => {
    it('should assign topics to discovered items', async () => {
      const result = await stage.execute(
        ['topic1', 'topic2'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      result.items.forEach(item => {
        expect(item.topicIds).toBeDefined();
        expect(Array.isArray(item.topicIds)).toBe(true);
      });
    });

    it('should calculate relevance scores using zero-shot classification', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: JSON.stringify({
          relevance: 0.85,
          topics: ['topic1'],
        }),
      });

      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      result.items.forEach(item => {
        expect(item.scores.relevance).toBeGreaterThanOrEqual(0);
        expect(item.scores.relevance).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Scoring Factors (R, A)', () => {
    it('should calculate recency score', async () => {
      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      result.items.forEach(item => {
        expect(item.scores.recency).toBeDefined();
        expect(item.scores.recency).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate authority score', async () => {
      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      result.items.forEach(item => {
        expect(item.scores.authority).toBeDefined();
        expect(item.scores.authority).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Entity Linking', () => {
    it('should link entities to discovered items', async () => {
      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      result.items.forEach(item => {
        expect(item.entityIds).toBeDefined();
        expect(Array.isArray(item.entityIds)).toBe(true);
      });
    });
  });

  describe('Statistics', () => {
    it('should track total items found', async () => {
      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      expect(result.stats.totalItemsFound).toBeGreaterThan(0);
    });

    it('should track items by topic', async () => {
      const result = await stage.execute(
        ['topic1', 'topic2'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      expect(result.stats.itemsByTopic).toBeDefined();
      expect(typeof result.stats.itemsByTopic).toBe('object');
    });

    it('should track average latency', async () => {
      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: [],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      expect(result.stats.avgLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Sources', () => {
    it('should aggregate items from multiple source types', async () => {
      mockHttpGateway.fetch.mockImplementation((request: any) => {
        if (request.url.includes('rss')) {
          return Promise.resolve({
            status: 200,
            body: `<?xml version="1.0"?>
              <rss version="2.0">
                <channel>
                  <item>
                    <title>RSS Article</title>
                    <link>https://example.com/rss-article</link>
                    <pubDate>Mon, 16 Nov 2025 00:00:00 GMT</pubDate>
                  </item>
                </channel>
              </rss>`,
          });
        } else if (request.url.includes('newsapi')) {
          return Promise.resolve({
            status: 200,
            body: JSON.stringify({
              articles: [
                {
                  title: 'News API Article',
                  url: 'https://news.com/article',
                  publishedAt: '2025-11-16T00:00:00Z',
                  source: { name: 'News' },
                },
              ],
            }),
          });
        }
        return Promise.resolve({ status: 200, body: '' });
      });

      const result = await stage.execute(
        ['topic1'],
        'Test Company',
        {
          rssFeeds: ['https://example.com/rss'],
          newsApis: ['https://newsapi.org'],
          irUrls: [],
          regulatorUrls: [],
          tradePublications: [],
        },
        mockEmitter
      );

      expect(result.items.length).toBeGreaterThan(0);
    });
  });
});

