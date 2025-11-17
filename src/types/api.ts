/**
 * API Request/Response types for REST endpoints
 */

import { z } from 'zod';

// ============================================================================
// Auth & User
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: 'owner' | 'editor' | 'viewer' | 'admin';
}

// ============================================================================
// Podcast CRUD
// ============================================================================

export interface CreatePodcastRequest {
  // Step 1: Branding & Metadata
  title: string;
  subtitle: string;
  description: string;
  author: string;
  email: string;
  category: string;
  explicit: boolean;
  language: string;

  // Step 2: Company & Industry
  companyId: string;
  industryId: string;
  competitorIds: string[];

  // Step 3: Preset & Cadence
  cadence: 'daily' | 'weekly' | 'monthly' | 'custom';
  durationMinutes: number;
  publishTime: string;
  timezone: string;
  timeWindowHours: number;

  // Step 4: Topics & Regions
  topicIds: string[];
  topicPriorities: Record<string, number>;
  regions: string[];
  sourceLanguages: string[];
  robotsMode: 'strict' | 'permissive';
  allowDomains: string[];
  blockDomains: string[];

  // Step 5: Voice & Review
  voiceId: string;
  voiceSpeed: number;
  voiceTone: string;
}

export const CreatePodcastRequestSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional().default(''),
  description: z.string().max(4000).optional().default(''),
  author: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')).transform(val => val || 'noreply@example.com'),
  category: z.string(),
  explicit: z.boolean(),
  language: z.string().length(2),
  companyId: z.string().min(1), // Accept any string (company name)
  industryId: z.string().min(1).optional().default('general'), // Accept any string (industry name)
  competitorIds: z.array(z.string().min(1)).optional().default([]), // Accept company names
  cadence: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  durationMinutes: z.number().min(1).max(60),
  publishTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string(),
  timeWindowHours: z.number().min(1).max(168),
  topicIds: z.array(z.string().min(1)), // Accept topic names
  topicPriorities: z.record(z.string(), z.number().min(0).max(100)).optional().default({}),
  regions: z.array(z.string().min(2).max(2)).optional().default(['US']),
  sourceLanguages: z.array(z.string().length(2)),
  robotsMode: z.enum(['strict', 'permissive']),
  allowDomains: z.array(z.string()).optional().default([]),
  blockDomains: z.array(z.string()).optional().default([]),
  voiceId: z.string(),
  voiceSpeed: z.number().min(0.25).max(4.0),
  voiceTone: z.string(),
});

export interface PodcastResponse {
  id: string;
  orgId: string;
  ownerUserId: string;
  title: string;
  subtitle: string;
  description: string;
  coverArtUrl: string;
  rssUrl: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt: string;
  config: {
    version: number;
    // ... full config snapshot
  };
}

// ============================================================================
// AI Suggestions
// ============================================================================

export interface SuggestCompetitorsRequest {
  companyId: string;
  industryId: string;
}

export interface SuggestCompetitorsResponse {
  competitors: Array<{
    id: string;
    name: string;
    relevanceScore: number;
    rationale: string;
  }>;
}

export interface SuggestTopicsRequest {
  companyId: string;
  industryId: string;
  competitorIds: string[];
}

export interface SuggestTopicsResponse {
  specialTopics: Array<{
    id: string;
    name: string;
    relevanceScore: number;
    rationale: string;
  }>;
}

// ============================================================================
// Runs
// ============================================================================

export interface CreateRunRequest {
  podcastId: string;
  flags?: Partial<{
    dryRun: boolean;
    provider: {
      llm?: string;
      tts?: string;
      http?: string;
    };
  }>;
}

export interface RunResponse {
  id: string;
  podcastId: string;
  configVersion: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  startedAt?: string;
  finishedAt?: string;
  stopReason?: string;
  episodeId?: string;
  errorMessage?: string;
}

export interface RunEventResponse {
  events: Array<{
    id: string;
    runId: string;
    ts: string;
    stage: string;
    substage?: string;
    pct: number;
    level: string;
    message: string;
    payload?: Record<string, unknown>;
  }>;
  nextToken?: string;
}

// ============================================================================
// Episodes
// ============================================================================

export interface EpisodeResponse {
  id: string;
  podcastId: string;
  runId: string;
  title: string;
  description: string;
  pubDate: string;
  durationSeconds: number;
  audioUrl: string;
  transcriptUrl: string;
  showNotesUrl: string;
  guid: string;
  episodeNumber: number;
  createdAt: string;
}

export interface EpisodeListResponse {
  episodes: EpisodeResponse[];
  nextToken?: string;
}

// ============================================================================
// Admin
// ============================================================================

export interface AdminRunsListRequest {
  orgId?: string;
  userId?: string;
  status?: string;
  limit?: number;
  nextToken?: string;
}

export interface DomainTelemetryResponse {
  domain: string;
  successRate: number;
  medianLatencyMs: number;
  robotsStatus: 'allowed' | 'disallowed' | 'unknown';
  scrapabilityScore: number;
  lastSeenAt: string;
  totalAttempts: number;
}

