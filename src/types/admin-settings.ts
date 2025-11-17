/**
 * Admin Settings Types
 * Global configuration for the podcast generation pipeline
 */

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
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_PIPELINE_SETTINGS: PipelineSettings = {
  wordsPerMinute: 150,
  wordsPerArticle: 500,
  scrapeSuccessRate: 0.5,
  relevantTextRate: 0.25,
};

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  id: 'global',
  pipeline: DEFAULT_PIPELINE_SETTINGS,
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

