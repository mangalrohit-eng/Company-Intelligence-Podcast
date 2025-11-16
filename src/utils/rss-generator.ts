/**
 * RSS Feed Generator - Creates iTunes/Podcasting 2.0 compliant feeds
 */

import { Episode } from '@/types/database';

interface PodcastMetadata {
  title: string;
  subtitle: string;
  description: string;
  author: string;
  email: string;
  category: string;
  explicit: boolean;
  language: string;
  coverArtUrl: string;
  link: string;
}

export class RssGenerator {
  generateFeed(metadata: PodcastMetadata, episodes: Episode[]): string {
    const now = new Date().toUTCString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:podcast="https://podcastindex.org/namespace/1.0"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${this.escapeXml(metadata.title)}</title>
    <description>${this.escapeXml(metadata.description)}</description>
    <link>${metadata.link}</link>
    <language>${metadata.language}</language>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    
    <!-- iTunes Tags -->
    <itunes:author>${this.escapeXml(metadata.author)}</itunes:author>
    <itunes:subtitle>${this.escapeXml(metadata.subtitle)}</itunes:subtitle>
    <itunes:summary>${this.escapeXml(metadata.description)}</itunes:summary>
    <itunes:explicit>${metadata.explicit ? 'yes' : 'no'}</itunes:explicit>
    <itunes:category text="${metadata.category}" />
    <itunes:owner>
      <itunes:name>${this.escapeXml(metadata.author)}</itunes:name>
      <itunes:email>${metadata.email}</itunes:email>
    </itunes:owner>
    <itunes:image href="${metadata.coverArtUrl}" />
    
    <!-- Atom Self Link -->
    <atom:link href="${metadata.link}" rel="self" type="application/rss+xml" />
    
    ${episodes.map((episode) => this.generateEpisodeItem(episode)).join('\n    ')}
  </channel>
</rss>`;
  }

  private generateEpisodeItem(episode: Episode): string {
    const audioUrl = `${process.env.CLOUDFRONT_DOMAIN}/${episode.mp3S3Key}`;

    return `<item>
      <title>${this.escapeXml(episode.title)}</title>
      <description>${this.escapeXml(episode.description)}</description>
      <pubDate>${new Date(episode.pubDate).toUTCString()}</pubDate>
      <guid isPermaLink="false">${episode.guid}</guid>
      <enclosure 
        url="${audioUrl}" 
        length="0" 
        type="audio/mpeg" />
      <itunes:duration>${episode.durationSeconds}</itunes:duration>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:episode>${episode.episodeNumber}</itunes:episode>
    </item>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  validateFeed(xml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation checks
    if (!xml.includes('<?xml version="1.0"')) {
      errors.push('Missing XML declaration');
    }

    if (!xml.includes('<rss version="2.0"')) {
      errors.push('Missing RSS version declaration');
    }

    if (!xml.includes('<channel>')) {
      errors.push('Missing channel element');
    }

    // iTunes required fields
    const requiredFields = ['itunes:author', 'itunes:category', 'itunes:image'];
    for (const field of requiredFields) {
      if (!xml.includes(field)) {
        errors.push(`Missing required iTunes field: ${field}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const rssGenerator = new RssGenerator();

