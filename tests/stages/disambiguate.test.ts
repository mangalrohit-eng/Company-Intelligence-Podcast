/**
 * Unit tests for Stage 3: Disambiguate
 * Tests entity linking with ≥0.85 confidence threshold
 */

import { DisambiguateStage } from '../../src/engine/stages/disambiguate';
import { DiscoveryItem } from '../../src/types/shared';

describe('Stage 3: Disambiguate', () => {
  let stage: DisambiguateStage;
  let mockLlmGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockLlmGateway = {
      complete: jest.fn(),
    };
    stage = new DisambiguateStage(mockLlmGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Confidence Threshold', () => {
    it('should filter items below 0.85 confidence', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://example.com/high',
          title: 'High Confidence',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
        {
          url: 'https://example.com/low',
          title: 'Low Confidence',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.5, recency: 0.5, authority: 0.5 },
        },
      ];

      const result = await stage.execute(items, [], [], 'permissive', mockEmitter);

      expect(result.stats.passedConfidenceThreshold).toBeGreaterThan(0);
      expect(result.stats.finalCount).toBeLessThanOrEqual(result.stats.passedConfidenceThreshold);
    });

    it('should require confidence ≥ 0.85', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://example.com/article',
          title: 'Test Article',
          publisher: 'Test Publisher',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.85, recency: 0.85, authority: 0.85 },
        },
      ];

      const result = await stage.execute(items, [], [], 'permissive', mockEmitter);

      const passedItems = result.items.filter(item => item.confidence >= 0.85);
      expect(passedItems.length).toBeGreaterThan(0);
    });
  });

  describe('Allow/Block Lists', () => {
    it('should block domains in block list', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://blocked.com/article',
          title: 'Blocked',
          publisher: 'Blocked',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
      ];

      const result = await stage.execute(items, [], ['blocked.com'], 'permissive', mockEmitter);

      expect(result.stats.blockedByPolicy).toBeGreaterThan(0);
    });

    it('should allow only domains in allow list', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://allowed.com/article',
          title: 'Allowed',
          publisher: 'Allowed',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
        {
          url: 'https://notallowed.com/article',
          title: 'Not Allowed',
          publisher: 'Not Allowed',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
      ];

      const result = await stage.execute(items, ['allowed.com'], [], 'permissive', mockEmitter);

      expect(result.stats.blockedByPolicy).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should track total input and final count', async () => {
      const items: DiscoveryItem[] = [
        {
          url: 'https://example.com/1',
          title: 'Article 1',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
        {
          url: 'https://example.com/2',
          title: 'Article 2',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scores: { relevance: 0.9, recency: 0.9, authority: 0.9 },
        },
      ];

      const result = await stage.execute(items, [], [], 'permissive', mockEmitter);

      expect(result.stats.totalInput).toBe(2);
      expect(result.stats.finalCount).toBeLessThanOrEqual(result.stats.totalInput);
    });
  });
});

