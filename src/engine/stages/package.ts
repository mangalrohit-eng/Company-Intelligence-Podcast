/**
 * Stage 13: Package & RSS Item
 * show_notes.md (thesis, bullets, ≤10 sources), transcripts (VTT+TXT), sources.json, RSS <item>
 * Per requirements section 2.3.3 #13
 */

import { EvidenceUnit, ThematicOutline } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { logger } from '@/utils/logger';
import { isS3Available, writeToS3 } from '@/lib/s3-storage';

export interface PackageOutput {
  showNotesPath: string;
  transcriptVttPath: string;
  transcriptTxtPath: string;
  sourcesJsonPath: string;
  rssItem: string;
}

export class PackageStage {
  async execute(
    episodeId: string,
    script: string,
    audioUrl: string,
    audioDurationSeconds: number,
    outline: ThematicOutline,
    evidenceUnits: EvidenceUnit[],
    publishDate: Date,
    outputDir: string,
    emitter: IEventEmitter
  ): Promise<PackageOutput> {
    await emitter.emit('package', 0, 'Starting episode packaging');

    // Always use S3 - outputDir parameter is kept for backward compatibility but not used
    if (!isS3Available()) {
      throw new Error('AWS credentials required. S3 storage must be configured for file operations.');
    }

    // Step 1: Generate show_notes.md (thesis, bullets, ≤10 sources)
    await emitter.emit('package', 20, 'Generating show notes');
    const showNotesPath = await this.generateShowNotes(
      episodeId,
      outline,
      evidenceUnits,
      outputDir
    );

    // Step 2: Generate transcript.vtt (WebVTT format)
    await emitter.emit('package', 40, 'Generating VTT transcript');
    const transcriptVttPath = await this.generateVTT(episodeId, script, audioDurationSeconds, outputDir);

    // Step 3: Generate transcript.txt (plain text)
    await emitter.emit('package', 60, 'Generating TXT transcript');
    const transcriptTxtPath = await this.generateTXT(episodeId, script, outputDir);

    // Step 4: Generate sources.json
    await emitter.emit('package', 70, 'Generating sources.json');
    const sourcesJsonPath = await this.generateSourcesJSON(episodeId, evidenceUnits, outputDir);

    // Step 5: Generate RSS <item>
    await emitter.emit('package', 90, 'Generating RSS item');
    const rssItem = this.generateRSSItem(
      episodeId,
      outline.theme,
      script,
      audioUrl,
      audioDurationSeconds,
      publishDate
    );

    logger.info('Package stage complete', {
      episodeId,
      showNotesPath,
      transcriptVttPath,
      transcriptTxtPath,
      sourcesJsonPath,
    });

    await emitter.emit('package', 100, 'Packaging complete');

    return {
      showNotesPath,
      transcriptVttPath,
      transcriptTxtPath,
      sourcesJsonPath,
      rssItem,
    };
  }

  /**
   * Generate show_notes.md with thesis, bullets, ≤10 sources
   */
  private async generateShowNotes(
    episodeId: string,
    outline: ThematicOutline,
    evidenceUnits: EvidenceUnit[],
    outputDir: string
  ): Promise<string> {
    const thesis = outline.theme;
    const bullets = outline.sections.map((s: any) => `- **${s.title}**: ${s.bulletPoints?.[0] || s.section}`);

    // Select top 10 sources by authority
    const topSources = evidenceUnits
      .sort((a, b) => b.authority - a.authority)
      .slice(0, 10)
      .map((e, i) => `${i + 1}. [${e.publisher}](${e.sourceUrl}) - ${e.publishedDate}`);

    const showNotes = `# Show Notes

## Thesis
${thesis}

## Key Points
${bullets.join('\n')}

## Sources (Top 10)
${topSources.join('\n')}

---
*Episode ID: ${episodeId}*
`;

    const filename = `${episodeId}_show_notes.md`;
    // Always save to S3
    const s3Key = `runs/${episodeId}/${filename}`;
    await writeToS3(s3Key, showNotes, 'text/markdown');
    logger.info('Show notes saved to S3', { s3Key });
    return s3Key;
  }

  /**
   * Generate WebVTT transcript
   */
  private async generateVTT(
    episodeId: string,
    script: string,
    durationSeconds: number,
    outputDir: string
  ): Promise<string> {
    // Simple VTT: split script into segments with timestamps
    const words = script.split(/\s+/);
    const wordsPerSecond = words.length / durationSeconds;
    const segments: string[] = [];

    let currentTime = 0;
    const segmentDuration = 10; // 10 seconds per segment

    for (let i = 0; i < words.length; i += Math.round(wordsPerSecond * segmentDuration)) {
      const segmentWords = words.slice(i, i + Math.round(wordsPerSecond * segmentDuration));
      const start = this.formatVTTTime(currentTime);
      currentTime += segmentDuration;
      const end = this.formatVTTTime(Math.min(currentTime, durationSeconds));

      segments.push(`${start} --> ${end}\n${segmentWords.join(' ')}\n`);
    }

    const vtt = `WEBVTT

${segments.join('\n')}`;

    const filename = `${episodeId}_transcript.vtt`;
    // Always save to S3
    const s3Key = `runs/${episodeId}/${filename}`;
    await writeToS3(s3Key, vtt, 'text/vtt');
    logger.info('VTT transcript saved to S3', { s3Key });
    return s3Key;
  }

  /**
   * Generate plain text transcript
   */
  private async generateTXT(
    episodeId: string,
    script: string,
    outputDir: string
  ): Promise<string> {
    const filename = `${episodeId}_transcript.txt`;
    // Always save to S3
    const s3Key = `runs/${episodeId}/${filename}`;
    await writeToS3(s3Key, script, 'text/plain');
    logger.info('TXT transcript saved to S3', { s3Key });
    return s3Key;
  }

  /**
   * Generate sources.json with all evidence metadata
   */
  private async generateSourcesJSON(
    episodeId: string,
    evidenceUnits: EvidenceUnit[],
    outputDir: string
  ): Promise<string> {
    const sources = evidenceUnits.map((e) => ({
      id: e.id,
      type: e.type,
      span: e.span,
      sourceUrl: e.sourceUrl,
      publisher: e.publisher,
      publishedDate: e.publishedDate,
      authority: e.authority,
    }));

    const filename = `${episodeId}_sources.json`;
    const content = JSON.stringify(sources, null, 2);
    
    // Always save to S3
    const s3Key = `runs/${episodeId}/${filename}`;
    await writeToS3(s3Key, content, 'application/json');
    logger.info('Sources JSON saved to S3', { s3Key });
    return s3Key;
  }

  /**
   * Generate RSS <item> XML
   */
  private generateRSSItem(
    episodeId: string,
    title: string,
    description: string,
    audioUrl: string,
    durationSeconds: number,
    publishDate: Date
  ): string {
    const descriptionExcerpt = description.substring(0, 500).replace(/[<>&"']/g, '');
    const pubDate = publishDate.toUTCString();

    return `<item>
  <title>${this.escapeXML(title)}</title>
  <description>${this.escapeXML(descriptionExcerpt)}...</description>
  <pubDate>${pubDate}</pubDate>
  <enclosure url="${this.escapeXML(audioUrl)}" type="audio/mpeg" />
  <guid isPermaLink="false">${episodeId}</guid>
  <itunes:duration>${durationSeconds}</itunes:duration>
  <itunes:explicit>no</itunes:explicit>
</item>`;
  }

  /**
   * Format time for VTT (HH:MM:SS.mmm)
   */
  private formatVTTTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

