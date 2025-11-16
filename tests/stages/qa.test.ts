/**
 * Unit tests for Stage 11: QA & Bind
 * Tests [CHECK] resolution, evidence binding, date sanity checks
 */

import { QAStage } from '../../src/engine/stages/qa';
import { EvidenceUnit } from '../../src/types/shared';

describe('Stage 11: QA & Bind', () => {
  let stage: QAStage;
  let mockLlmGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockLlmGateway = {
      complete: jest.fn().mockResolvedValue({
        content: 'Verified: The claim is accurate based on evidence.',
      }),
    };
    stage = new QAStage(mockLlmGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('[CHECK] Marker Resolution', () => {
    it('should identify all [CHECK] markers', async () => {
      const script = 'The company grew [CHECK] and achieved success [CHECK].';
      const evidence: EvidenceUnit[] = [];
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await stage.execute(script, evidence, startDate, endDate, mockEmitter);

      expect(result.checkMarkers.length).toBe(2);
    });

    it('should resolve each [CHECK] marker', async () => {
      mockLlmGateway.complete.mockResolvedValueOnce({
        content: 'Verified: claim is accurate',
      }).mockResolvedValueOnce({
        content: 'Verified: claim is accurate',
      });

      const script = 'Claim 1 [CHECK]. Claim 2 [CHECK].';
      const evidence: EvidenceUnit[] = [
        {
          id: 'ev1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'Supporting stat',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-15',
          authority: 0.9,
        },
      ];
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await stage.execute(script, evidence, startDate, endDate, mockEmitter);

      expect(result.stats.checksVerified).toBe(2);
    });

    it('should flag unverifiable claims', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: 'Cannot verify: insufficient evidence',
      });

      const script = 'Unverifiable claim [CHECK].';
      const evidence: EvidenceUnit[] = [];
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await stage.execute(script, evidence, startDate, endDate, mockEmitter);

      expect(result.stats.checksFailed).toBeGreaterThan(0);
    });
  });

  describe('Evidence Binding', () => {
    it('should bind every stat and quote to evidence', async () => {
      const script = 'The company achieved 50% growth. CEO said "we are innovating."';
      const evidence: EvidenceUnit[] = [
        {
          id: 'stat-1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: '50% growth',
          context: 'Performance',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-15',
          authority: 0.9,
        },
        {
          id: 'quote-1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'quote',
          span: 'we are innovating',
          context: 'CEO',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-15',
          authority: 0.9,
        },
      ];
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await stage.execute(script, evidence, startDate, endDate, mockEmitter);

      expect(result.stats.statsBound).toBeGreaterThan(0);
      expect(result.stats.quotesBound).toBeGreaterThan(0);
    });

    it('should track binding statistics', async () => {
      const script = '50% growth happened. "quote here" was said.';
      const evidence: EvidenceUnit[] = [
        {
          id: 'ev1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: '50% growth',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-15',
          authority: 0.9,
        },
      ];
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await stage.execute(script, evidence, startDate, endDate, mockEmitter);

      expect(result.stats.totalBindings).toBeGreaterThan(0);
    });
  });

  describe('Date Sanity Checks', () => {
    it('should validate dates within time window', async () => {
      const script = 'Recent news from January 15.';
      const evidence: EvidenceUnit[] = [
        {
          id: 'ev1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'Stat',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2025-01-15',
          authority: 0.9,
        },
      ];
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await stage.execute(script, evidence, startDate, endDate, mockEmitter);

      expect(result.dateChecks.inWindow).toBeGreaterThan(0);
    });

    it('should flag dates outside time window', async () => {
      const script = 'Old news from last year.';
      const evidence: EvidenceUnit[] = [
        {
          id: 'ev1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'Old stat',
          context: 'Context',
          sourceUrl: 'https://example.com',
          publisher: 'Test',
          publishedDate: '2023-01-01', // Outside window
          authority: 0.9,
        },
      ];
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await stage.execute(script, evidence, startDate, endDate, mockEmitter);

      expect(result.dateChecks.outsideWindow).toBeGreaterThan(0);
    });
  });

  describe('Final Script', () => {
    it('should return cleaned script without [CHECK] markers', async () => {
      const script = 'Clean script [CHECK] should not have markers [CHECK].';
      const evidence: EvidenceUnit[] = [];
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await stage.execute(script, evidence, startDate, endDate, mockEmitter);

      expect(result.finalScript).not.toContain('[CHECK]');
    });
  });
});

