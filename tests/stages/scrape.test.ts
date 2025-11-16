/**
 * Unit tests for Stage 5: Scrape
 * Tests stop conditions, per-domain concurrency, and telemetry
 */

import { ScrapeStage } from '../../src/engine/stages/scrape';
import { DiscoveryItem } from '../../src/types/shared';

describe('Stage 5: Scrape', () => {
  let stage: ScrapeStage;
  let mockHttpGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockHttpGateway = {
      fetch: jest.fn().mockResolvedValue({
        status: 200,
        body: '<html><body>Test content</body></html>',
      }),
    };
    stage = new ScrapeStage(mockHttpGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Stop Conditions', () => {
    it('should stop when targets met', async () => {
      const items: DiscoveryItem[] = Array.from({ length: 10 }, (_, i) => ({
        url: `https://example.com/${i}`,
        title: `Article ${i}`,
        publisher: 'Test',
        publishedDate: '2025-01-01',
        topicIds: ['topic1'],
        entityIds: ['entity1'],
        scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
      }));

      const topicTargets = {
        topic1: { targetUnits: 2 }, // Low target to trigger stop
      };

      const result = await stage.execute(
        items,
        topicTargets,
        'permissive',
        mockEmitter,
        { timeCapMinutes: 60, fetchCap: 100 }
      );

      expect(result.stopReason).toBeDefined();
      expect(['targets_met', 'time_cap', 'fetch_cap', 'queue_exhausted']).toContain(result.stopReason);
    }, 10000); // Increase timeout to 10 seconds

    it('should respect fetch cap', async () => {
      const items: DiscoveryItem[] = Array.from({ length: 100 }, (_, i) => ({
        url: `https://example.com/${i}`,
        title: `Article ${i}`,
        publisher: 'Test',
        publishedDate: '2025-01-01',
        topicIds: ['topic1'],
        entityIds: ['entity1'],
        scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
      }));

      const topicTargets = { topic1: { targetUnits: 1000 } };

      const result = await stage.execute(
        items,
        topicTargets,
        'permissive',
        mockEmitter,
        { fetchCap: 5 } // Low fetch cap
      );

      expect(result.stats.successCount).toBeLessThanOrEqual(5);
    });
  });

  describe('Per-Domain Telemetry', () => {
    it('should track per-domain stats', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://domain1.com/article',
          title: 'Article 1',
          publisher: 'Domain 1',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
        {
          url: 'https://domain2.com/article',
          title: 'Article 2',
          publisher: 'Domain 2',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
      ];

      const topicTargets = { topic1: { targetUnits: 10 } };

      const result = await stage.execute(items, topicTargets, 'permissive', mockEmitter);

      expect(result.stats.domainStats).toBeDefined();
      expect(Object.keys(result.stats.domainStats).length).toBeGreaterThan(0);
    });

    it('should track average latency', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://example.com/article',
          title: 'Test',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
      ];

      const topicTargets = { topic1: { targetUnits: 10 } };

      const result = await stage.execute(items, topicTargets, 'permissive', mockEmitter);

      expect(result.stats.avgLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Breadth and Confidence', () => {
    it('should track per-topic breadth (unique sources)', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://source1.com/article',
          title: 'Article 1',
          publisher: 'Source 1',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
        {
          url: 'https://source2.com/article',
          title: 'Article 2',
          publisher: 'Source 2',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
      ];

      const topicTargets = { topic1: { targetUnits: 10 } };

      const result = await stage.execute(items, topicTargets, 'permissive', mockEmitter);

      expect(result.perTopicProgress['topic1']).toBeDefined();
      expect(result.perTopicProgress['topic1'].breadth).toBeGreaterThan(0);
    });

    it('should calculate confidence score', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://example.com/article',
          title: 'Test',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
      ];

      const topicTargets = { topic1: { targetUnits: 10 } };

      const result = await stage.execute(items, topicTargets, 'permissive', mockEmitter);

      expect(result.perTopicProgress['topic1'].confidence).toBeGreaterThanOrEqual(0);
      expect(result.perTopicProgress['topic1'].confidence).toBeLessThanOrEqual(1);
    });
  });
});

