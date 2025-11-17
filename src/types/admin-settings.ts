/**
 * Admin Settings Types
 * Global configuration for the podcast generation pipeline
 */

export type OpenAIModel = 'gpt-4-turbo-preview' | 'gpt-4' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k';

export interface ModelSettings {
  // Feature Models
  competitorIdentification: OpenAIModel;  // Used in competitor suggestion
  
  // Pipeline Stage Models
  extract: OpenAIModel;                   // Extract evidence from articles
  summarize: OpenAIModel;                 // Summarize topics
  contrast: OpenAIModel;                  // Generate competitor contrasts
  outline: OpenAIModel;                   // Generate thematic outline
  script: OpenAIModel;                    // Generate podcast script
  qa: OpenAIModel;                        // Verify [CHECK] markers
}

export interface RssFeed {
  id: string;
  name: string;
  url: string;                      // Use {company} as placeholder for company name
  enabled: boolean;
  description?: string;
}

export interface DiscoverySettings {
  rssFeeds: RssFeed[];
}

export interface PipelineSettings {
  // Speech & Content Settings
  wordsPerMinute: number;           // Default: 150 (average speaking rate)
  wordsPerArticle: number;          // Default: 500 (average article length)
  
  // Pipeline Performance Settings
  scrapeSuccessRate: number;        // Default: 0.5 (50% success rate)
  relevantTextRate: number;         // Default: 0.25 (25% of article is relevant)
  
  // Derived Settings (calculated)
  // articlesNeeded = (duration × wordsPerMinute) / (scrapeSuccessRate × relevantTextRate × wordsPerArticle)
}

export interface AdminSettings {
  id: string;
  pipeline: PipelineSettings;
  models: ModelSettings;
  discovery: DiscoverySettings;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_PIPELINE_SETTINGS: PipelineSettings = {
  wordsPerMinute: 150,
  wordsPerArticle: 500,
  scrapeSuccessRate: 0.5,
  relevantTextRate: 0.25,
};

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  // Feature Models
  competitorIdentification: 'gpt-3.5-turbo',
  
  // Pipeline Stage Models - Optimized for cost/quality balance
  extract: 'gpt-3.5-turbo',          // ✅ Simple extraction, GPT-3.5 works great (90% cheaper)
  summarize: 'gpt-3.5-turbo',        // ✅ Straightforward summarization
  contrast: 'gpt-3.5-turbo',         // ✅ Simple comparisons
  outline: 'gpt-4-turbo-preview',    // 🎯 Thematic thinking needs GPT-4
  script: 'gpt-4-turbo-preview',     // 🎯 Creative writing needs GPT-4
  qa: 'gpt-3.5-turbo',               // ✅ Yes/no verification
};

export const DEFAULT_DISCOVERY_SETTINGS: DiscoverySettings = {
  rssFeeds: [
    {
      id: 'google-news',
      name: 'Google News',
      url: 'https://news.google.com/rss/search?q={company}',
      enabled: true,
      description: 'Google News aggregates articles from thousands of sources. Use {company} placeholder.',
    },
    // Disabled examples (Reuters discontinued, FT doesn't support filtering)
    {
      id: 'reuters',
      name: 'Reuters Company News',
      url: 'https://www.reuters.com/rssfeed/companyNews',
      enabled: false,
      description: 'Reuters company news feed (discontinued in 2020, not recommended)',
    },
    {
      id: 'ft',
      name: 'Financial Times',
      url: 'https://www.ft.com/?format=rss',
      enabled: false,
      description: 'FT general news (no keyword filtering support)',
    },
  ],
};

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  id: 'global',
  pipeline: DEFAULT_PIPELINE_SETTINGS,
  models: DEFAULT_MODEL_SETTINGS,
  discovery: DEFAULT_DISCOVERY_SETTINGS,
  updatedAt: new Date().toISOString(),
};

/**
 * Calculate the number of articles needed for a given duration
 */
export function calculateArticlesNeeded(
  durationMinutes: number,
  settings: PipelineSettings
): number {
  const numerator = durationMinutes * settings.wordsPerMinute;
  const denominator = settings.scrapeSuccessRate * settings.relevantTextRate * settings.wordsPerArticle;
  return Math.ceil(numerator / denominator);
}

