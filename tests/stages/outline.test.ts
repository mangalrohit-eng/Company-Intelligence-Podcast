/**
 * Unit tests for Stage 9: Outline
 * Tests knowledge graph → theme + sub-themes → 5-section outline
 */

import { OutlineStage } from '../../src/engine/stages/outline';
import { TopicSummary } from '../../src/types/shared';

describe('Stage 9: Outline', () => {
  let stage: OutlineStage;
  let mockLlmGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockLlmGateway = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          theme: 'AI Revolution in Enterprise',
          subThemes: ['Automation', 'Data Analytics'],
          sections: [
            { section: 'cold_open', title: 'Cold Open', bulletPoints: ['Hook', 'Theme'] },
            { section: 'deep_dive', title: 'Deep Dive', bulletPoints: ['Details'] },
            { section: 'competitors', title: 'Competitors', bulletPoints: ['Analysis'] },
            { section: 'industry', title: 'Industry', bulletPoints: ['Trends'] },
            { section: 'takeaways', title: 'Takeaways', bulletPoints: ['Summary'] },
          ],
        }),
      }),
    };
    stage = new OutlineStage(mockLlmGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Theme Identification', () => {
    it('should identify 1 dominant theme', async () => {
      const summaries: TopicSummary[] = [
        {
          topicId: 'topic1',
          topicName: 'Topic 1',
          paragraph: 'Summary paragraph',
          onAirStat: { span: 'Stat', evidenceId: 'id1' },
          onAirQuote: { span: 'Quote', evidenceId: 'id2' },
          inferenceFlags: [],
        },
      ];

      const result = await stage.execute(summaries, 'Test Company', mockEmitter);

      expect(result.outline.theme).toBeDefined();
      expect(typeof result.outline.theme).toBe('string');
    });

    it('should identify up to 2 sub-themes (no more)', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: JSON.stringify({
          theme: 'Main Theme',
          subThemes: ['Sub 1', 'Sub 2', 'Sub 3'], // 3 provided
          sections: [],
        }),
      });

      const summaries: TopicSummary[] = [
        {
          topicId: 'topic1',
          topicName: 'Topic 1',
          paragraph: 'Summary',
          onAirStat: { span: 'Stat', evidenceId: 'id1' },
          onAirQuote: { span: 'Quote', evidenceId: 'id2' },
          inferenceFlags: [],
        },
      ];

      const result = await stage.execute(summaries, 'Test Company', mockEmitter);

      expect(result.outline.subThemes.length).toBeLessThanOrEqual(2);
    });
  });

  describe('5-Section Outline', () => {
    it('should generate exactly 5 sections', async () => {
      const summaries: TopicSummary[] = [
        {
          topicId: 'topic1',
          topicName: 'Topic 1',
          paragraph: 'Summary',
          onAirStat: { span: 'Stat', evidenceId: 'id1' },
          onAirQuote: { span: 'Quote', evidenceId: 'id2' },
          inferenceFlags: [],
        },
      ];

      const result = await stage.execute(summaries, 'Test Company', mockEmitter);

      expect(result.outline.sections).toHaveLength(5);
    });

    it('should include required section types', async () => {
      const summaries: TopicSummary[] = [
        {
          topicId: 'topic1',
          topicName: 'Topic 1',
          paragraph: 'Summary',
          onAirStat: { span: 'Stat', evidenceId: 'id1' },
          onAirQuote: { span: 'Quote', evidenceId: 'id2' },
          inferenceFlags: [],
        },
      ];

      const result = await stage.execute(summaries, 'Test Company', mockEmitter);

      const sectionTitles = result.outline.sections.map((s: any) => s.title || s.section).join(' ');
      
      // Should mention these key section types
      expect(sectionTitles.toLowerCase()).toMatch(/cold|open|dive|competitor|industry|takeaway/);
    });
  });

  describe('Knowledge Graph', () => {
    it('should track knowledge graph entities', async () => {
      const summaries: TopicSummary[] = [
        {
          topicId: 'topic1',
          topicName: 'Topic 1',
          paragraph: 'Summary',
          onAirStat: { span: 'Stat', evidenceId: 'id1' },
          onAirQuote: { span: 'Quote', evidenceId: 'id2' },
          inferenceFlags: [],
        },
        {
          topicId: 'topic2',
          topicName: 'Topic 2',
          paragraph: 'Summary',
          onAirStat: { span: 'Stat', evidenceId: 'id3' },
          onAirQuote: { span: 'Quote', evidenceId: 'id4' },
          inferenceFlags: [],
        },
      ];

      const result = await stage.execute(summaries, 'Test Company', mockEmitter);

      expect(result.knowledgeGraph).toBeDefined();
      expect(result.knowledgeGraph.entities).toBeGreaterThan(0);
      expect(result.knowledgeGraph.relationships).toBeGreaterThan(0);
    });
  });
});

