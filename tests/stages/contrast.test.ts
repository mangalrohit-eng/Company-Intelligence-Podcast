/**
 * Unit tests for Stage 8: Competitor Contrasts
 * Tests 1-2 sentences contrasting company vs competitors with bound evidence
 */

import { ContrastStage } from '../../src/engine/stages/contrast';
import { EvidenceUnit } from '../../src/types/shared';

describe('Stage 8: Competitor Contrasts', () => {
  let stage: ContrastStage;
  let mockLlmGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockLlmGateway = {
      complete: jest.fn().mockResolvedValue({
        content: 'While our company grew by 50%, competitors only achieved 20% growth.',
      }),
    };
    stage = new ContrastStage(mockLlmGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Competitor Contrasts', () => {
    it('should generate contrasts for each topic', async () => {
      const evidence = new Map<string, EvidenceUnit[]>();
      evidence.set('topic1', [
        {
          id: 'stat1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: '50% growth',
          context: 'Our company performance',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(
        ['topic1'],
        evidence,
        'Our Company',
        ['Competitor A', 'Competitor B'],
        mockEmitter
      );

      expect(result.contrasts.length).toBeGreaterThan(0);
    });

    it('should bind contrast to evidence', async () => {
      const evidence = new Map<string, EvidenceUnit[]>();
      evidence.set('topic1', [
        {
          id: 'evidence-123',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: '50% growth',
          context: 'Company vs competitor',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(
        ['topic1'],
        evidence,
        'Our Company',
        ['Competitor'],
        mockEmitter
      );

      expect(result.contrasts[0].boundStatOrQuote).toBeDefined();
      expect(result.contrasts[0].boundStatOrQuote.evidenceId).toBe('evidence-123');
    });

    it('should create 1-2 sentences (brief contrasts)', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: 'Company A leads with 50% growth. Competitor B trails at 20%.',
      });

      const evidence = new Map<string, EvidenceUnit[]>();
      evidence.set('topic1', [
        {
          id: 'stat1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: '50% growth',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(
        ['topic1'],
        evidence,
        'Company A',
        ['Competitor B'],
        mockEmitter
      );

      // sentences is already an array
      expect(result.contrasts[0].sentences.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Statistics', () => {
    it('should track contrasts by topic', async () => {
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
      ]);
      evidence.set('topic2', [
        {
          id: 'stat2',
          topicId: 'topic2',
          entityId: 'entity1',
          type: 'stat',
          span: 'Stat',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ]);

      const result = await stage.execute(
        ['topic1', 'topic2'],
        evidence,
        'Company',
        ['Competitor'],
        mockEmitter
      );

      expect(result.stats.byTopic['topic1']).toBeDefined();
      expect(result.stats.byTopic['topic2']).toBeDefined();
    });
  });
});

