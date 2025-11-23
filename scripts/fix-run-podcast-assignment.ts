/**
 * Script to identify and fix runs assigned to wrong podcasts
 * Usage: tsx scripts/fix-run-podcast-assignment.ts [runId]
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { readFile as readFileSync } from 'fs';
import { existsSync } from 'fs';

const RUNS_DB_FILE = join(process.cwd(), 'data', 'runs.json');
const OUTPUT_DIR = join(process.cwd(), 'output', 'episodes');

interface PersistedRun {
  id: string;
  podcastId: string;
  status: string;
  createdAt: string;
  [key: string]: any;
}

async function loadRuns(): Promise<Record<string, PersistedRun[]>> {
  try {
    const data = await readFile(RUNS_DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function determinePodcastFromRun(runId: string): Promise<string | null> {
  try {
    const prepareInputPath = join(OUTPUT_DIR, runId, 'debug', 'prepare_input.json');
    if (!existsSync(prepareInputPath)) {
      return null;
    }
    
    const content = await readFile(prepareInputPath, 'utf-8');
    const prepareInput = JSON.parse(content);
    
    // Try to find podcast by matching company name or title
    // This is a heuristic - ideally podcastId should be stored in run metadata
    const companyName = prepareInput.config?.company?.name;
    const podcastTitle = prepareInput.config?.title;
    
    console.log(`Run ${runId} config:`, {
      company: companyName,
      title: podcastTitle,
    });
    
    // We can't reliably determine podcastId from this alone
    // But we can at least identify mismatches
    return null; // Return null to indicate we can't determine
  } catch (error) {
    return null;
  }
}

async function findRunInAllPodcasts(runId: string): Promise<{ podcastId: string; run: PersistedRun } | null> {
  const allRuns = await loadRuns();
  
  for (const [podcastId, runs] of Object.entries(allRuns)) {
    const found = runs.find(r => r.id === runId);
    if (found) {
      return { podcastId, run: found };
    }
  }
  
  return null;
}

async function main() {
  const runId = process.argv[2];
  
  if (runId) {
    // Check specific run
    console.log(`\n🔍 Checking run: ${runId}\n`);
    
    const found = await findRunInAllPodcasts(runId);
    if (found) {
      console.log(`✅ Found in database:`);
      console.log(`   Podcast ID: ${found.podcastId}`);
      console.log(`   Status: ${found.run.status}`);
      console.log(`   Created: ${found.run.createdAt}`);
      
      const determined = await determinePodcastFromRun(runId);
      if (determined && determined !== found.podcastId) {
        console.log(`\n⚠️  MISMATCH: Run config suggests podcast: ${determined}`);
        console.log(`   But run is stored under: ${found.podcastId}`);
      }
    } else {
      console.log(`❌ Run not found in database`);
    }
  } else {
    // Scan all runs for potential issues
    console.log(`\n🔍 Scanning all runs for potential misassignments...\n`);
    
    const allRuns = await loadRuns();
    const issues: Array<{ runId: string; currentPodcast: string; issue: string }> = [];
    
    for (const [podcastId, runs] of Object.entries(allRuns)) {
      for (const run of runs) {
        // Check if run directory exists and try to determine actual podcast
        const runDir = join(OUTPUT_DIR, run.id);
        if (existsSync(runDir)) {
          const determined = await determinePodcastFromRun(run.id);
          // For now, we can't reliably determine, but we can check for duplicates
        }
      }
    }
    
    // Check for duplicate run IDs across podcasts
    const runIdMap = new Map<string, string[]>();
    for (const [podcastId, runs] of Object.entries(allRuns)) {
      for (const run of runs) {
        if (!runIdMap.has(run.id)) {
          runIdMap.set(run.id, []);
        }
        runIdMap.get(run.id)!.push(podcastId);
      }
    }
    
    const duplicates = Array.from(runIdMap.entries()).filter(([_, podcasts]) => podcasts.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} runs assigned to multiple podcasts:\n`);
      for (const [runId, podcasts] of duplicates) {
        console.log(`   Run ${runId}:`);
        console.log(`     Assigned to: ${podcasts.join(', ')}`);
        issues.push({
          runId,
          currentPodcast: podcasts[0],
          issue: `Assigned to multiple podcasts: ${podcasts.join(', ')}`,
        });
      }
    } else {
      console.log(`✅ No duplicate run assignments found`);
    }
    
    if (issues.length > 0) {
      console.log(`\n💡 To fix, you can manually edit data/runs.json`);
      console.log(`   Or use this script with a specific runId to see details`);
    }
  }
}

main().catch(console.error);

