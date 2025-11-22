/**
 * Core types for the AI Podcast Platform
 * Flag-driven, record/replay pipeline architecture
 */

import { z } from 'zod';

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderType = 'openai' | 'replay' | 'stub';

export const ProviderSchema = z.enum(['openai', 'replay', 'stub']);

export interface ProviderConfig {
  llm: ProviderType;
  tts: ProviderType;
  http: ProviderType;
}

// ============================================================================
// Run Flags - Control pipeline execution
// ============================================================================

export interface RunFlags {
  dryRun: boolean;
  provider: ProviderConfig;
  cassetteKey: string;
  enable: {
    discover: boolean;
    scrape: boolean;
    extract: boolean;
    summarize: boolean;
    contrast: boolean;
    outline: boolean;
    script: boolean;
    qa: boolean;
    tts: boolean;
    package: boolean;
  };
  limits?: {
    maxDiscoveryItems?: number;
    maxScrapeUrls?: number;
    maxDurationSeconds?: number;
    timeboxMinutes?: number;
  };
}

export const RunFlagsSchema = z.object({
  dryRun: z.boolean().default(false),
  provider: z.object({
    llm: ProviderSchema.default('replay'),
    tts: ProviderSchema.default('stub'),
    http: ProviderSchema.default('replay'),
  }),
  cassetteKey: z.string().default('default'),
  enable: z.object({
    discover: z.boolean().default(true),
    scrape: z.boolean().default(true),
    extract: z.boolean().default(true),
    summarize: z.boolean().default(true),
    contrast: z.boolean().default(true),
    outline: z.boolean().default(true),
    script: z.boolean().default(true),
    qa: z.boolean().default(true),
    tts: z.boolean().default(true),
    package: z.boolean().default(true),
  }),
  limits: z
    .object({
      maxDiscoveryItems: z.number().optional(),
      maxScrapeUrls: z.number().optional(),
      maxDurationSeconds: z.number().optional(),
      timeboxMinutes: z.number().optional(),
    })
    .optional(),
});

// ============================================================================
// Run Events - Progress tracking
// ============================================================================

export type RunEventLevel = 'info' | 'warn' | 'error' | 'debug';
export type RunEventStage =
  | 'prepare'
  | 'discover'
  | 'disambiguate'
  | 'rank'
  | 'scrape'
  | 'extract'
  | 'summarize'
  | 'contrast'
  | 'outline'
  | 'script'
  | 'qa'
  | 'tts'
  | 'package';

export interface RunEvent {
  id: string;
  runId: string;
  ts: string; // ISO 8601
  stage: RunEventStage;
  substage?: string;
  pct: number; // 0-100
  level: RunEventLevel;
  message: string;
  payload?: Record<string, unknown>;
}

export const RunEventSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  ts: z.string().datetime(),
  stage: z.enum([
    'prepare',
    'discover',
    'disambiguate',
    'rank',
    'scrape',
    'extract',
    'summarize',
    'contrast',
    'outline',
    'script',
    'qa',
    'tts',
    'package',
  ]),
  substage: z.string().optional(),
  pct: z.number().min(0).max(100),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  payload: z.record(z.unknown()).optional(),
});

// ============================================================================
// Pipeline Input/Output Types
// ============================================================================

export interface PipelineInput {
  runId: string;
  podcastId: string;
  configVersion: number;
  config: PodcastConfigSnapshot;
  flags: RunFlags;
}

export interface PipelineOutput {
  runId: string;
  status: 'success' | 'failed' | 'partial';
  episodeId?: string;
  artifacts: {
    mp3S3Key?: string;
    transcriptS3Key?: string;
    showNotesS3Key?: string;
    sourcesS3Key?: string;
  };
  telemetry: RunTelemetry;
  error?: string;
}

// ============================================================================
// Podcast Configuration Snapshot
// ============================================================================

export interface PodcastConfigSnapshot {
  // Metadata
  title: string;
  subtitle: string;
  description: string;
  author: string;
  email: string;
  category: string;
  explicit: boolean;
  language: string;
  coverArtS3Key: string;

  // Core Config
  company: {
    id: string;
    name: string;
  };
  industry: {
    id: string;
    name: string;
  };
  competitors: Array<{
    id: string;
    name: string;
    isAiSuggested: boolean;
  }>;

  // Topics
  topics: {
    standard: Array<{
      id: string;
      name: string;
      priority: number; // 0-100
    }>;
    special: Array<{
      id: string;
      name: string;
      priority: number;
    }>;
  };

  // Cadence & Timing
  cadence: 'daily' | 'weekly' | 'monthly' | 'custom';
  durationMinutes: number;
  publishTime: string; // HH:mm
  timezone: string;
  timeWindowHours: number; // how far back to look for news
  timeWindow: {
    startIso: string;
    endIso: string;
  };

  // Geographic & Language
  regions: string[]; // ISO country codes
  sourceLanguages: string[]; // ISO language codes

  // Voice & Tone
  voice: {
    provider: 'openai-tts';
    voiceId: string; // e.g., 'alloy', 'echo', 'fable'
    speed: number; // 0.25 - 4.0
    tone: string; // 'professional', 'casual', etc.
  };

  // Compliance & Policies
  robotsMode: 'strict' | 'permissive';
  sourcePolicies: {
    allowDomains: string[];
    blockDomains: string[];
  };
}

// ============================================================================
// Telemetry
// ============================================================================

export interface RunTelemetry {
  startTime: string;
  endTime: string;
  durationSeconds: number;
  stages: Record<
    string,
    {
      startTime: string;
      endTime: string;
      durationMs: number;
      status: 'success' | 'failed' | 'skipped';
      metrics?: Record<string, number>;
      error?: string;
    }
  >;
  discovery?: {
    totalItemsFound: number;
    itemsByTopic: Record<string, number>;
  };
  scrape?: {
    totalUrls: number;
    successCount: number;
    failureCount: number;
    avgLatencyMs: number;
    domainStats: Record<string, { success: number; failure: number; avgLatencyMs: number }>;
  };
  evidence?: {
    totalUnits: number;
    targetUnits: number;
    unitsByTopic: Record<string, number>;
  };
  llm?: {
    totalTokens: number;
    totalCalls: number;
    avgLatencyMs: number;
  };
  tts?: {
    audioDurationSeconds: number;
    generationTimeSeconds: number;
    finalSpeed: number;
  };
  stopReason?: string;
}

// ============================================================================
// Data Models (simplified for engine use)
// ============================================================================

export interface DiscoveryItem {
  url: string;
  title: string;
  snippet: string;
  publisher: string;
  publishedDate: string;
  entityIds: string[]; // company/competitor IDs
  topicIds: string[];
  scores: {
    relevance: number;
    recency: number;
    authority: number;
    expectedInfoGain: number;
  };
}

export interface EvidenceUnit {
  id: string;
  topicId: string;
  entityId: string;
  type: 'stat' | 'quote' | 'claim';
  span: string; // the actual text (≤10 words for quotes)
  context: string; // surrounding sentences
  sourceUrl: string;
  publisher: string;
  publishedDate: string;
  authority: number; // 0-1
  stance?: string;
  clusterLabel?: string;
}

export interface TopicSummary {
  topicId: string;
  topicName: string;
  paragraph: string;
  onAirStat: {
    span: string;
    evidenceId: string;
  };
  onAirQuote: {
    span: string;
    evidenceId: string;
  };
  inferenceFlags: string[]; // [CHECK] markers
}

export interface CompetitorContrast {
  topicId: string;
  sentences: string[];
  boundStatOrQuote: {
    span: string;
    evidenceId: string;
  };
}

export interface ThematicOutline {
  theme: string;
  subThemes: string[];
  sections: Array<{
    section: 'cold_open' | 'company_deep_dive' | 'competitor_moves' | 'industry_topic' | 'takeaways';
    title: string;
    bulletPoints: string[];
  }>;
}

export interface Script {
  narrative: string; // full script
  boundEvidence: Record<string, string>; // evidenceId -> span in narrative
  durationEstimateSeconds: number;
}

export interface Episode {
  id: string;
  podcastId: string;
  runId: string;
  title: string;
  description: string;
  pubDate: string;
  durationSeconds: number;
  mp3S3Key: string;
  transcriptS3Key: string;
  showNotesS3Key: string;
  sourcesJson: string; // S3 key
  guid: string;
  episodeNumber: number;
}

