/**
 * Database entity types (DynamoDB/Aurora)
 */

// ============================================================================
// User & Organization
// ============================================================================

export interface User {
  id: string; // PK
  email: string; // GSI
  name: string;
  orgId: string; // GSI
  role: 'owner' | 'editor' | 'viewer' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string; // PK
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  quotas: {
    maxPodcasts: number;
    maxRunsPerMonth: number;
    maxDurationMinutes: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Podcast
// ============================================================================

export interface Podcast {
  id: string; // PK
  orgId: string; // GSI
  ownerUserId: string;
  title: string;
  subtitle: string;
  description: string;
  author: string;
  email: string;
  category: string;
  explicit: boolean;
  language: string;
  coverArtS3Key: string;
  rssUrl: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  currentConfigVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface PodcastConfig {
  podcastId: string; // PK
  version: number; // SK
  cadence: 'daily' | 'weekly' | 'monthly' | 'custom';
  durationMinutes: number;
  timeWindowHours: number;
  timezone: string;
  publishTime: string;
  companyId: string;
  industryId: string;
  voiceConfig: {
    provider: string;
    voiceId: string;
    speed: number;
    tone: string;
  };
  robotsMode: 'strict' | 'permissive';
  regionFilters: string[];
  topicPriorities: Record<string, number>;
  sourcePolicies: {
    allowDomains: string[];
    blockDomains: string[];
  };
  createdAt: string;
}

export interface PodcastCompetitor {
  podcastId: string; // PK
  version: number; // Part of composite key
  companyId: string; // SK
  isAiSuggested: boolean;
  createdAt: string;
}

export interface PodcastTopic {
  podcastId: string; // PK
  version: number; // Part of composite key
  topicId: string; // SK
  type: 'standard' | 'special';
  priorityWeight: number;
  createdAt: string;
}

// ============================================================================
// Run & Events
// ============================================================================

export interface Run {
  id: string; // PK
  podcastId: string; // GSI
  configVersion: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  startedAt?: string;
  finishedAt?: string;
  stopReason?: string;
  metricsJson?: string; // JSON stringified telemetry
  errorMessage?: string;
  episodeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RunEvent {
  id: string; // PK
  runId: string; // GSI
  ts: string; // SK (ISO timestamp)
  stage: string;
  substage?: string;
  pct: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  payloadJson?: string; // JSON stringified payload
}

// ============================================================================
// Episode
// ============================================================================

export interface Episode {
  id: string; // PK
  podcastId: string; // GSI
  runId: string;
  title: string;
  description: string;
  pubDate: string; // ISO
  durationSeconds: number;
  mp3S3Key: string;
  transcriptS3Key: string;
  showNotesS3Key: string;
  sourcesS3Key: string;
  guid: string;
  episodeNumber: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Discovery & Evidence (transient, may live in S3 or temp DB)
// ============================================================================

export interface DiscoveryItem {
  runId: string; // PK
  url: string; // SK
  title: string;
  snippet: string;
  publisher: string;
  publishedDate: string;
  entityIds: string[];
  topicIds: string[];
  scoresJson: string; // JSON stringified scores
  createdAt: string;
}

export interface EvidenceUnit {
  id: string; // PK
  runId: string; // GSI
  topicId: string;
  entityId: string;
  type: 'stat' | 'quote' | 'claim';
  span: string;
  context: string;
  sourceUrl: string;
  publisher: string;
  publishedDate: string;
  authority: number;
  stance?: string;
  clusterLabel?: string;
  createdAt: string;
}

// ============================================================================
// Domain Telemetry
// ============================================================================

export interface DomainTelemetry {
  domain: string; // PK
  successRate: number;
  medianLatencyMs: number;
  robotsStatus: 'allowed' | 'disallowed' | 'unknown';
  scrapabilityScore: number;
  lastSeenAt: string;
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  updatedAt: string;
}

