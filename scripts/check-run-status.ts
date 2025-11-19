/**
 * Check run status and details
 * Usage: tsx scripts/check-run-status.ts <runId> [podcastId]
 */

import 'dotenv/config';

async function checkRunStatus(runId: string, podcastId?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  console.log(`🔍 Checking run status: ${runId}`);
  console.log(`📡 API URL: ${baseUrl}\n`);
  
  if (!podcastId) {
    console.log(`⚠️ Podcast ID not provided. Trying to find run...`);
    // We need podcast ID to fetch runs, but let's try to get it from the run ID pattern
    // Or we could scan all podcasts, but that's inefficient
    console.log(`❌ Cannot check run without podcast ID. Please provide it as second argument.`);
    console.log(`Usage: tsx scripts/check-run-status.ts <runId> <podcastId>`);
    process.exit(1);
  }
  
  try {
    // Fetch runs for the podcast
    const response = await fetch(`${baseUrl}/api/podcasts/${podcastId}/runs`);
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`❌ Error: ${data.error || 'Unknown error'}`);
      process.exit(1);
    }
    
    // Find the specific run
    const runs = Array.isArray(data) ? data : (data.runs || []);
    const run = runs.find((r: any) => r.id === runId);
    
    if (!run) {
      console.log(`❌ Run not found: ${runId}`);
      console.log(`📊 Found ${runs.length} runs for podcast ${podcastId}`);
      if (runs.length > 0) {
        console.log(`\nRecent runs:`);
        runs.slice(0, 5).forEach((r: any) => {
          console.log(`  - ${r.id} (${r.status}) - ${r.startedAt || r.createdAt || 'unknown time'}`);
        });
      }
      process.exit(1);
    }
    
    console.log(`✅ Run found!\n`);
    console.log(`Run ID: ${run.id}`);
    console.log(`Status: ${run.status}`);
    console.log(`Started: ${run.startedAt || run.createdAt || 'unknown'}`);
    console.log(`Completed: ${run.completedAt || 'not completed'}`);
    console.log(`Current Stage: ${run.progress?.currentStage || 'unknown'}`);
    
    if (run.error) {
      console.log(`\n❌ Error: ${run.error}`);
    }
    
    if (run.progress?.stages) {
      console.log(`\n📊 Stage Status:`);
      Object.entries(run.progress.stages).forEach(([stage, status]: [string, any]) => {
        const statusIcon = status.status === 'success' ? '✅' : 
                          status.status === 'failed' ? '❌' : 
                          status.status === 'running' ? '🔄' : '⏳';
        console.log(`  ${statusIcon} ${stage}: ${status.status || 'pending'}`);
      });
    }
    
    if (run.output) {
      console.log(`\n📦 Output:`);
      console.log(`  Audio: ${run.output.audioPath || run.output.mp3S3Key || 'not available'}`);
      console.log(`  Episode ID: ${run.output.episodeId || 'not available'}`);
    }
    
    // Try to fetch logs
    console.log(`\n📋 Attempting to fetch logs...`);
    try {
      const logsResponse = await fetch(`${baseUrl}/api/runs/${runId}/logs`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        if (logsData.logs) {
          const lines = logsData.logs.split('\n');
          console.log(`✅ Logs available: ${lines.length} lines`);
          console.log(`\n--- Last 20 log lines ---`);
          lines.slice(-20).forEach(line => console.log(line));
        } else {
          console.log(`⚠️ Logs not available yet`);
        }
      } else {
        console.log(`⚠️ Could not fetch logs: ${logsResponse.status}`);
      }
    } catch (logError) {
      console.log(`⚠️ Error fetching logs: ${logError}`);
    }
    
  } catch (error) {
    console.error(`\n❌ Failed to check run status:`, error);
    process.exit(1);
  }
}

// Get run ID and podcast ID from command line
const runId = process.argv[2];
const podcastId = process.argv[3];

if (!runId) {
  console.error('Usage: tsx scripts/check-run-status.ts <runId> <podcastId>');
  console.error('Example: tsx scripts/check-run-status.ts run_1763583989753_8tkrly podcast_xxx');
  process.exit(1);
}

checkRunStatus(runId, podcastId);

