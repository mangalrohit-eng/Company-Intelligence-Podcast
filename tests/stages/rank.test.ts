/**
 * Unit tests for Stage 4: Rank
 * Tests Expected Info Gain/Cost with R,F,A,D,S,C factors
 */

import { RankStage } from '../../src/engine/stages/rank';
import { DiscoveryItem } from '../../src/types/shared';

describe('Stage 4: Rank', () => {
  let stage: RankStage;
  let mockEmitter: any;

  beforeEach(() => {
    stage = new RankStage();
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Ranking Factors (R,F,A,D,S,C)', () => {
    it('should compute all six ranking factors', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://example.com/article',
          title: 'Test Article',
          publisher: 'Test Publisher',
          publishedDate: new Date().toISOString(),
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.8, recency: 0.9, authority: 0.7 },
        },
      ];

      const result = await stage.execute(items, mockEmitter);

      const rankedItem = Array.from(result.topicQueues.values())[0]?.[0];
      expect(rankedItem).toBeDefined();
      expect(rankedItem.rankingFactors).toHaveProperty('R'); // Recency
      expect(rankedItem.rankingFactors).toHaveProperty('F'); // Freshness
      expect(rankedItem.rankingFactors).toHaveProperty('A'); // Authority
      expect(rankedItem.rankingFactors).toHaveProperty('D'); // Diversity
      expect(rankedItem.rankingFactors).toHaveProperty('S'); // Specificity
      expect(rankedItem.rankingFactors).toHaveProperty('C'); // Cost
    });

    it('should calculate Expected Info Gain / Cost', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://example.com/article',
          title: 'Test Article',
          publisher: 'Test Publisher',
          publishedDate: new Date().toISOString(),
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.8, recency: 0.9, authority: 0.7 },
        },
      ];

      const result = await stage.execute(items, mockEmitter);

      const rankedItem = Array.from(result.topicQueues.values())[0]?.[0];
      expect(rankedItem.expectedInfoGain).toBeGreaterThan(0);
      expect(rankedItem.cost).toBeGreaterThan(0);
      expect(rankedItem.rankScore).toBe(rankedItem.expectedInfoGain / rankedItem.cost);
    });
  });

  describe('Priority Queues', () => {
    it('should create per-topic priority queues', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://example.com/1',
          title: 'Article 1',
          publisher: 'Test',
          publishedDate: new Date().toISOString(),
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.8, recency: 0.9, authority: 0.7 },
        },
        {
          url: 'https://example.com/2',
          title: 'Article 2',
          publisher: 'Test',
          publishedDate: new Date().toISOString(),
          topicIds: ['topic2'],
          entityIds: ['entity1'],
          scores: { relevance: 0.7, recency: 0.8, authority: 0.6 },
        },
      ];

      const result = await stage.execute(items, mockEmitter);

      expect(result.topicQueues.size).toBe(2);
      expect(result.topicQueues.has('topic1')).toBe(true);
      expect(result.topicQueues.has('topic2')).toBe(true);
    });

    it('should sort queues by rankScore descending', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://example.com/high',
          title: 'High Score',
          publisher: 'High Authority',
          publishedDate: new Date().toISOString(),
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
        {
          url: 'https://example.com/low',
          title: 'Low Score',
          publisher: 'Low Authority',
          publishedDate: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days old
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.5, recency: 0.5, authority: 0.5 },
        },
      ];

      const result = await stage.execute(items, mockEmitter);

      const queue = result.topicQueues.get('topic1');
      expect(queue).toBeDefined();
      expect(queue![0].rankScore).toBeGreaterThanOrEqual(queue![1].rankScore);
    });
  });

  describe('Diversity Factor', () => {
    it('should penalize over-represented domains', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://same.com/1',
          title: 'Article 1',
          publisher: 'Same',
          publishedDate: new Date().toISOString(),
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.8, recency: 0.9, authority: 0.7 },
        },
        {
          url: 'https://same.com/2',
          title: 'Article 2',
          publisher: 'Same',
          publishedDate: new Date().toISOString(),
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.8, recency: 0.9, authority: 0.7 },
        },
        {
          url: 'https://different.com/1',
          title: 'Article 3',
          publisher: 'Different',
          publishedDate: new Date().toISOString(),
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.8, recency: 0.9, authority: 0.7 },
        },
      ];

      const result = await stage.execute(items, mockEmitter);

      const queue = result.topicQueues.get('topic1');
      const sameItems = queue?.filter(item => item.url.includes('same.com'));
      const diffItem = queue?.find(item => item.url.includes('different.com'));

      // Different domain should have higher diversity score
      expect(diffItem?.rankingFactors.D).toBeGreaterThan(sameItems![0].rankingFactors.D);
    });
  });
});

