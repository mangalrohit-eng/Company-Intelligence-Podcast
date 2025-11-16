/**
 * Unit tests for Stage 6: Extract
 * Tests ≤10-word quote constraint, deduplication, breadth/confidence
 */

import { ExtractStage } from '../../src/engine/stages/extract';
import { ScrapedContent } from '../../src/engine/stages/scrape';

describe('Stage 6: Extract', () => {
  let stage: ExtractStage;
  let mockLlmGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockLlmGateway = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          items: [
            { type: 'stat', span: 'Revenue grew 50%', context: 'Company performance' },
            { type: 'quote', span: 'This is a short quote', context: 'CEO said' },
          ],
        }),
      }),
    };
    stage = new ExtractStage(mockLlmGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Quote Length Constraint', () => {
    it('should enforce ≤10-word quotes', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: JSON.stringify({
          items: [
            {
              type: 'quote',
              span: 'one two three four five six seven eight nine ten eleven',
              context: 'Too long',
            },
          ],
        }),
      });

      const contents: ScrapedContent[] = [
        {
          url: 'https://example.com/article',
          title: 'Test',
          content: 'Content',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scrapedAt: new Date(),
          latencyMs: 100,
        },
      ];

      const result = await stage.execute(contents, mockEmitter);

      const quotes = result.units.filter(u => u.type === 'quote');
      quotes.forEach(quote => {
        const wordCount = quote.span.split(/\s+/).length;
        expect(wordCount).toBeLessThanOrEqual(10);
      });
    });

    it('should truncate quotes longer than 10 words', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: JSON.stringify({
          items: [
            {
              type: 'quote',
              span: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12',
              context: 'Long quote',
            },
          ],
        }),
      });

      const contents: ScrapedContent[] = [
        {
          url: 'https://example.com/article',
          title: 'Test',
          content: 'Content',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scrapedAt: new Date(),
          latencyMs: 100,
        },
      ];

      const result = await stage.execute(contents, mockEmitter);

      const quotes = result.units.filter(u => u.type === 'quote');
      expect(quotes[0].span).toMatch(/\.\.\./); // Should have ellipsis
    });
  });

  describe('Deduplication', () => {
    it('should remove duplicate evidence', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: JSON.stringify({
          items: [
            { type: 'stat', span: 'Same stat', context: 'Context 1' },
            { type: 'stat', span: 'Same stat', context: 'Context 2' }, // Duplicate
          ],
        }),
      });

      const contents: ScrapedContent[] = [
        {
          url: 'https://example.com/article',
          title: 'Test',
          content: 'Content',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scrapedAt: new Date(),
          latencyMs: 100,
        },
      ];

      const result = await stage.execute(contents, mockEmitter);

      expect(result.stats.dedupeRemoved).toBeGreaterThan(0);
    });

    it('should track number of duplicates removed', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: JSON.stringify({
          items: [
            { type: 'stat', span: 'Duplicate', context: 'A' },
            { type: 'stat', span: 'Duplicate', context: 'B' },
            { type: 'stat', span: 'Duplicate', context: 'C' },
          ],
        }),
      });

      const contents: ScrapedContent[] = [
        {
          url: 'https://example.com/article',
          title: 'Test',
          content: 'Content',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scrapedAt: new Date(),
          latencyMs: 100,
        },
      ];

      const result = await stage.execute(contents, mockEmitter);

      expect(result.stats.dedupeRemoved).toBe(2); // Should keep 1, remove 2
    });
  });

  describe('Breadth and Confidence', () => {
    it('should calculate breadth (unique sources) per topic', async () => {
      const contents: ScrapedContent[] = [
        {
          url: 'https://source1.com/article',
          title: 'Test 1',
          content: 'Content 1',
          publisher: 'Source 1',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scrapedAt: new Date(),
          latencyMs: 100,
        },
        {
          url: 'https://source2.com/article',
          title: 'Test 2',
          content: 'Content 2',
          publisher: 'Source 2',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scrapedAt: new Date(),
          latencyMs: 100,
        },
      ];

      const result = await stage.execute(contents, mockEmitter);

      expect(result.breadthConfidence['topic1']).toBeDefined();
      expect(result.breadthConfidence['topic1'].breadth).toBe(2); // 2 unique sources
    });

    it('should calculate confidence score based on breadth and authority', async () => {
      const contents: ScrapedContent[] = [
        {
          url: 'https://example.com/article',
          title: 'Test',
          content: 'Content',
          publisher: 'High Authority Publisher',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scrapedAt: new Date(),
          latencyMs: 100,
        },
      ];

      const result = await stage.execute(contents, mockEmitter);

      expect(result.breadthConfidence['topic1'].confidence).toBeGreaterThan(0);
      expect(result.breadthConfidence['topic1'].confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Evidence Types', () => {
    it('should extract stats, quotes, and claims', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: JSON.stringify({
          items: [
            { type: 'stat', span: '50% growth', context: 'Performance' },
            { type: 'quote', span: 'We are growing', context: 'CEO quote' },
            { type: 'claim', span: 'Company is leader', context: 'Market analysis' },
          ],
        }),
      });

      const contents: ScrapedContent[] = [
        {
          url: 'https://example.com/article',
          title: 'Test',
          content: 'Content',
          publisher: 'Test',
          publishedDate: '2025-01-01',
          topicIds: ['topic1'],
          entityIds: ['entity1'],
          scrapedAt: new Date(),
          latencyMs: 100,
        },
      ];

      const result = await stage.execute(contents, mockEmitter);

      expect(result.stats.byType['stat']).toBeGreaterThan(0);
      expect(result.stats.byType['quote']).toBeGreaterThan(0);
      expect(result.stats.byType['claim']).toBeGreaterThan(0);
    });
  });
});

