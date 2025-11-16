/**
 * Unit tests for Stage 10: Script & Polish
 * Tests ~150 wpm scaling, bridges, and tone unification
 */

import { ScriptStage } from '../../src/engine/stages/script';
import { ThematicOutline } from '../../src/types/shared';

describe('Stage 10: Script & Polish', () => {
  let stage: ScriptStage;
  let mockLlmGateway: any;
  let mockEmitter: any;

  beforeEach(() => {
    mockLlmGateway = {
      complete: jest.fn().mockResolvedValue({
        content: 'Welcome to the podcast. ' + 'word '.repeat(1450), // ~1500 words
      }),
    };
    stage = new ScriptStage(mockLlmGateway);
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Word Budget (~150 wpm)', () => {
    it('should scale script to target duration', async () => {
      const outline: ThematicOutline = {
        theme: 'Test Theme',
        subThemes: ['Sub 1'],
        sections: [
          { section: 'cold_open', title: 'Cold Open', bulletPoints: ['Point 1'] },
          { section: 'deep_dive', title: 'Deep Dive', bulletPoints: ['Point 2'] },
          { section: 'competitors', title: 'Competitors', bulletPoints: ['Point 3'] },
          { section: 'industry', title: 'Industry', bulletPoints: ['Point 4'] },
          { section: 'takeaways', title: 'Takeaways', bulletPoints: ['Point 5'] },
        ],
      };

      const targetDurationMinutes = 10;

      const result = await stage.execute(outline, targetDurationMinutes, mockEmitter);

      const wordCount = result.script.fullText.split(/\s+/).length;
      const targetWords = targetDurationMinutes * 150;
      
      // Should be within reasonable range (±20%)
      expect(wordCount).toBeGreaterThan(targetWords * 0.8);
      expect(wordCount).toBeLessThan(targetWords * 1.2);
    });

    it('should calculate word count statistics', async () => {
      const outline: ThematicOutline = {
        theme: 'Test Theme',
        subThemes: [],
        sections: [
          { section: 'cold_open', title: 'Cold Open', bulletPoints: ['Point'] },
        ],
      };

      const result = await stage.execute(outline, 10, mockEmitter);

      expect(result.stats.wordCount).toBeGreaterThan(0);
      expect(result.stats.estimatedDurationMinutes).toBeGreaterThan(0);
    });
  });

  describe('Narrative Flow', () => {
    it('should generate bridges between sections', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: 'Section A content. [BRIDGE] Now transitioning to Section B. Section B content.',
      });

      const outline: ThematicOutline = {
        theme: 'Test Theme',
        subThemes: [],
        sections: [
          { section: 'cold_open', title: 'Cold Open', bulletPoints: ['A'] },
          { section: 'deep_dive', title: 'Deep Dive', bulletPoints: ['B'] },
          { section: 'competitors', title: 'Competitors', bulletPoints: ['C'] },
          { section: 'industry', title: 'Industry', bulletPoints: ['D'] },
          { section: 'takeaways', title: 'Takeaways', bulletPoints: ['E'] },
        ],
      };

      const result = await stage.execute(outline, 10, mockEmitter);

      expect(result.stats.bridgeCount).toBeGreaterThan(0);
    });

    it('should unify tone across script', async () => {
      const outline: ThematicOutline = {
        theme: 'Test Theme',
        subThemes: [],
        sections: [
          { section: 'cold_open', title: 'Cold Open', bulletPoints: ['Point'] },
        ],
      };

      const result = await stage.execute(outline, 10, mockEmitter);

      expect(result.script.fullText).toBeDefined();
      expect(result.script.fullText.length).toBeGreaterThan(0);
    });
  });

  describe('Thematic Flow', () => {
    it('should focus on thematic flow not article-by-article recap', async () => {
      const outline: ThematicOutline = {
        theme: 'Main Theme',
        subThemes: ['Sub Theme'],
        sections: [
          { section: 'cold_open', title: 'Cold Open', bulletPoints: ['Theme intro'] },
          { section: 'deep_dive', title: 'Deep Dive', bulletPoints: ['Theme deep dive'] },
          { section: 'competitors', title: 'Competitors', bulletPoints: ['Analysis'] },
          { section: 'industry', title: 'Industry', bulletPoints: ['Trends'] },
          { section: 'takeaways', title: 'Takeaways', bulletPoints: ['Summary'] },
        ],
      };

      const result = await stage.execute(outline, 10, mockEmitter);

      // Script should reference the theme
      expect(result.script.fullText.toLowerCase()).toContain('theme');
    });
  });

  describe('Statistics', () => {
    it('should track section word counts', async () => {
      const outline: ThematicOutline = {
        theme: 'Test Theme',
        subThemes: [],
        sections: [
          { section: 'cold_open', title: 'Cold Open', bulletPoints: ['Point'] },
        ],
      };

      const result = await stage.execute(outline, 10, mockEmitter);

      expect(result.stats.sectionWordCounts).toBeDefined();
      expect(Object.keys(result.stats.sectionWordCounts).length).toBeGreaterThan(0);
    });

    it('should calculate estimated duration', async () => {
      mockLlmGateway.complete.mockResolvedValue({
        content: 'word '.repeat(1500), // 1500 words = ~10 minutes
      });

      const outline: ThematicOutline = {
        theme: 'Test Theme',
        subThemes: [],
        sections: [
          { section: 'cold_open', title: 'Cold Open', bulletPoints: ['Point'] },
        ],
      };

      const result = await stage.execute(outline, 10, mockEmitter);

      expect(result.stats.estimatedDurationMinutes).toBeCloseTo(10, 1);
    });
  });
});

