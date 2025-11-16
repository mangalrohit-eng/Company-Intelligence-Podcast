/**
 * Unit tests for Stage 7: Summarize
 * Tests exactly 1 stat + 1 quote per topic, [CHECK] marker requirements
 */

import { SummarizeStage } from '../../src/engine/stages/summarize';
import { EvidenceUnit } from '../../src/types/shared';

describe('Stage 7: Summarize', () => {
  let stage: SummarizeStage;
  let mockLlmGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockLlmGateway = {
      complete: jest.fn().mockResolvedValue({
        content: 'The company grew by 50% [CHECK] which suggests strong market performance. As the CEO stated, "We are innovating rapidly."',
      }),
    };
    stage = new SummarizeStage(mockLlmGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Exactly 1 Stat + 1 Quote Per Topic', () => {
    it('should select exactly one stat per topic', async () => {
      const evidence = new Map<string, EvidenceUnit[]>();
      evidence.set('topic1', [
        {
          id: 'stat1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: '50% growth',
          context: 'Performance',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
        {
          id: 'stat2',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: '100M revenue',
          context: 'Financials',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.8,
        },
        {
          id: 'quote1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'quote',
          span: 'We are growing',
          context: 'CEO',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(['topic1'], evidence, mockEmitter);

      expect(result.summaries).toHaveLength(1);
      expect(result.summaries[0].onAirStat).toBeDefined();
      expect(result.summaries[0].onAirQuote).toBeDefined();
    });

    it('should select highest authority stat', async () => {
      const evidence = new Map<string, EvidenceUnit[]>();
      evidence.set('topic1', [
        {
          id: 'stat1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'Low authority stat',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.5,
        },
        {
          id: 'stat2',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'High authority stat',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
        {
          id: 'quote1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'quote',
          span: 'Quote',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(['topic1'], evidence, mockEmitter);

      expect(result.summaries[0].onAirStat.span).toBe('High authority stat');
    });
  });

  describe('[CHECK] Marker for Inferences', () => {
    it('should mark inferences with [CHECK]', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: 'The company is performing well [CHECK] based on the 50% growth rate.',
      });

      const evidence = new Map<string, EvidenceUnit[]>();
      evidence.set('topic1', [
        {
          id: 'stat1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: '50% growth',
          context: 'Performance',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
        {
          id: 'quote1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'quote',
          span: 'We are growing',
          context: 'CEO',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(['topic1'], evidence, mockEmitter);

      expect(result.summaries[0].inferenceFlags.length).toBeGreaterThan(0);
      expect(result.stats.totalInferences).toBeGreaterThan(0);
    });

    it('should count total inferences across all topics', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: 'Inference 1 [CHECK] and inference 2 [CHECK].',
      });

      const evidence = new Map<string, EvidenceUnit[]>();
      evidence.set('topic1', [
        {
          id: 'stat1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'Stat',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
        {
          id: 'quote1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'quote',
          span: 'Quote',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(['topic1'], evidence, mockEmitter);

      expect(result.stats.totalInferences).toBe(2);
    });
  });

  describe('Evidence Binding', () => {
    it('should bind stat and quote to evidence IDs', async () => {
      const evidence = new Map<string, EvidenceUnit[]>();
      evidence.set('topic1', [
        {
          id: 'stat-id-123',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: '50% growth',
          context: 'Performance',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
        {
          id: 'quote-id-456',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'quote',
          span: 'We are growing',
          context: 'CEO',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(['topic1'], evidence, mockEmitter);

      expect(result.summaries[0].onAirStat.evidenceId).toBe('stat-id-123');
      expect(result.summaries[0].onAirQuote.evidenceId).toBe('quote-id-456');
    });
  });

  describe('Statistics', () => {
    it('should track average inferences per topic', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: 'Content with [CHECK] marker.',
      });

      const evidence = new Map<string, EvidenceUnit[]>();
      evidence.set('topic1', [
        {
          id: 'stat1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'Stat',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
        {
          id: 'quote1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'quote',
          span: 'Quote',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(['topic1'], evidence, mockEmitter);

      expect(result.stats.avgInferencesPerTopic).toBeGreaterThanOrEqual(0);
    });
  });
});

