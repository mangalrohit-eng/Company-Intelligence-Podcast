/**
 * Persistent storage for runs
 * Saves all runs (successful and failed) to disk
 */

import { promises as fs } from 'fs';
import { join } from 'path';

const RUNS_DB_FILE = join(process.cwd(), 'data', 'runs.json');

export interface PersistedRun {
  id: string;
  podcastId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  progress: any;
  output?: any;
}

async function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Load all runs from disk
 */
export async function loadRuns(): Promise<Record<string, PersistedRun[]>> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(RUNS_DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty object
    return {};
  }
}

/**
 * Save all runs to disk
 */
export async function saveRuns(runs: Record<string, PersistedRun[]>): Promise<void> {
  try {
    await ensureDataDir();
    await fs.writeFile(RUNS_DB_FILE, JSON.stringify(runs, null, 2));
  } catch (error) {
    console.error('Failed to save runs to disk:', error);
  }
}

/**
 * Save a single run (upsert)
 */
export async function saveRun(run: PersistedRun): Promise<void> {
  const allRuns = await loadRuns();
  
  if (!allRuns[run.podcastId]) {
    allRuns[run.podcastId] = [];
  }
  
  // Find existing run and update, or add new
  const existingIndex = allRuns[run.podcastId].findIndex(r => r.id === run.id);
  if (existingIndex >= 0) {
    allRuns[run.podcastId][existingIndex] = run;
  } else {
    allRuns[run.podcastId].push(run);
  }
  
  await saveRuns(allRuns);
}

/**
 * Get runs for a specific podcast
 */
export async function getRunsForPodcast(podcastId: string): Promise<PersistedRun[]> {
  const allRuns = await loadRuns();
  return allRuns[podcastId] || [];
}

/**
 * Delete old failed runs (keep only last 50 per podcast)
 */
export async function cleanupOldRuns(): Promise<void> {
  const allRuns = await loadRuns();
  
  for (const podcastId in allRuns) {
    const runs = allRuns[podcastId];
    
    // Keep all completed runs, but limit failed runs to last 50
    const completedRuns = runs.filter(r => r.status === 'completed');
    const failedRuns = runs.filter(r => r.status === 'failed' || r.status === 'running')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50); // Keep only last 50 failed
    
    allRuns[podcastId] = [...completedRuns, ...failedRuns];
  }
  
  await saveRuns(allRuns);
}

