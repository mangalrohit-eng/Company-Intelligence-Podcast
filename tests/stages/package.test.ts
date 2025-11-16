/**
 * Unit tests for Stage 13: Package & RSS
 * Tests show_notes.md, transcripts (VTT+TXT), sources.json, RSS <item>
 */

import { PackageStage } from '../../src/engine/stages/package';
import { EvidenceUnit } from '../../src/types/shared';

describe('Stage 13: Package & RSS', () => {
  let stage: PackageStage;
  let mockEmitter: any;

  beforeEach(() => {
    stage = new PackageStage();
    mockEmitter = {
      emit: jest.fn(),
    };
  });

  describe('Show Notes Generation', () => {
    it('should generate show_notes.md with thesis', async () => {
      const script = 'Podcast script content.';
      const theme = 'AI Revolution';
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        script,
        'https://example.com/audio.mp3',
        600,
        theme,
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.showNotes).toContain(theme);
      expect(result.showNotes).toMatch(/##.*Thesis/i);
    });

    it('should include bullet points in show notes', async () => {
      const script = 'Script with multiple points.';
      const theme = 'Test Theme';
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        script,
        'https://example.com/audio.mp3',
        600,
        theme,
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.showNotes).toMatch(/[-*]\s+/); // Should contain bullet points
    });

    it('should include ≤10 sources in show notes', async () => {
      const evidence: EvidenceUnit[] = Array.from({ length: 20 }, (_, i) => ({
        id: `ev${i}`,
        topicId: 'topic1',
        entityId: 'entity1',
        type: 'stat',
        span: `Stat ${i}`,
        context: 'Context',
        sourceUrl: `https://source${i}.com`,
        publisher: `Publisher ${i}`,
        publishedDate: '2025-01-01',
        authority: 0.9 - i * 0.01,
      }));

      const result = await stage.execute(
        'Script',
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      // Count source links in show notes
      const sourceMatches = result.showNotes.match(/https?:\/\//g);
      expect(sourceMatches ? sourceMatches.length : 0).toBeLessThanOrEqual(10);
    });
  });

  describe('Transcript Generation', () => {
    it('should generate VTT transcript', async () => {
      const script = 'This is a test transcript.';
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        script,
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.transcripts.vtt).toContain('WEBVTT');
      expect(result.transcripts.vtt).toContain('00:00:00');
    });

    it('should generate TXT transcript', async () => {
      const script = 'Plain text transcript content.';
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        script,
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.transcripts.txt).toContain(script);
    });

    it('should include timestamps in VTT', async () => {
      const script = 'Script with timing.';
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        script,
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.transcripts.vtt).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });
  });

  describe('Sources JSON', () => {
    it('should generate sources.json with all evidence sources', async () => {
      const evidence: EvidenceUnit[] = [
        {
          id: 'ev1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'Stat 1',
          context: 'Context',
          sourceUrl: 'https://source1.com',
          publisher: 'Publisher 1',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
        {
          id: 'ev2',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'quote',
          span: 'Quote 1',
          context: 'Context',
          sourceUrl: 'https://source2.com',
          publisher: 'Publisher 2',
          publishedDate: '2025-01-02',
          authority: 0.8,
        },
      ];

      const result = await stage.execute(
        'Script',
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      const sourcesJson = JSON.parse(result.sourcesJson);
      expect(sourcesJson.sources).toHaveLength(2);
    });

    it('should deduplicate sources by URL', async () => {
      const evidence: EvidenceUnit[] = [
        {
          id: 'ev1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'Stat 1',
          context: 'Context',
          sourceUrl: 'https://same-source.com',
          publisher: 'Publisher',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
        {
          id: 'ev2',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'quote',
          span: 'Quote 1',
          context: 'Context',
          sourceUrl: 'https://same-source.com', // Duplicate URL
          publisher: 'Publisher',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ];

      const result = await stage.execute(
        'Script',
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      const sourcesJson = JSON.parse(result.sourcesJson);
      expect(sourcesJson.sources).toHaveLength(1);
    });
  });

  describe('RSS Item XML', () => {
    it('should generate valid RSS <item> XML', async () => {
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        'Script',
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.rssItem).toContain('<item>');
      expect(result.rssItem).toContain('</item>');
      expect(result.rssItem).toContain('<title>');
      expect(result.rssItem).toContain('<enclosure');
    });

    it('should include iTunes and Podcasting 2.0 tags', async () => {
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        'Script',
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.rssItem).toMatch(/<itunes:/);
      expect(result.rssItem).toContain('<enclosure');
    });

    it('should include audio duration', async () => {
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        'Script',
        'https://example.com/audio.mp3',
        600, // 10 minutes
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.rssItem).toContain('600');
    });

    it('should escape XML special characters', async () => {
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        'Script',
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode <with> "Special" & Characters',
        mockEmitter
      );

      expect(result.rssItem).not.toContain('&<');
      expect(result.rssItem).toMatch(/&lt;|&gt;|&amp;|&quot;/);
    });
  });

  describe('Statistics', () => {
    it('should track number of sources included', async () => {
      const evidence: EvidenceUnit[] = [
        {
          id: 'ev1',
          topicId: 'topic1',
          entityId: 'entity1',
          type: 'stat',
          span: 'Stat',
          context: 'Context',
          sourceUrl: 'https://source1.com',
          publisher: 'Publisher',
          publishedDate: '2025-01-01',
          authority: 0.9,
        },
      ];

      const result = await stage.execute(
        'Script',
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.stats.totalSources).toBe(1);
    });

    it('should track show notes word count', async () => {
      const evidence: EvidenceUnit[] = [];

      const result = await stage.execute(
        'Script',
        'https://example.com/audio.mp3',
        600,
        'Theme',
        evidence,
        'Episode Title',
        mockEmitter
      );

      expect(result.stats.showNotesWordCount).toBeGreaterThan(0);
    });
  });
});

