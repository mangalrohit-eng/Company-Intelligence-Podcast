/**
 * Script to start a run and monitor logs
 * Usage: tsx scripts/start-run-and-monitor.ts <podcastId>
 */

import 'dotenv/config';

async function startRunAndMonitor(podcastId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  console.log(`🚀 Starting run for podcast: ${podcastId}`);
  console.log(`📡 API URL: ${baseUrl}`);
  
  // Step 1: Start the run
  try {
    const startResponse = await fetch(`${baseUrl}/api/podcasts/${podcastId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!startResponse.ok) {
      const error = await startResponse.text();
      throw new Error(`Failed to start run: ${error}`);
    }
    
    const runData = await startResponse.json();
    const runId = runData.runId;
    
    console.log(`✅ Run started: ${runId}`);
    console.log(`📊 Monitor logs at: ${baseUrl}/runs/${runId}/logs`);
    console.log(`\n🔄 Polling logs every 2 seconds...\n`);
    
    // Step 2: Monitor logs
    let lastLogLength = 0;
    const pollInterval = setInterval(async () => {
      try {
        const logsResponse = await fetch(`${baseUrl}/api/runs/${runId}/logs`);
        const logsData = await logsResponse.json();
        
        if (logsResponse.ok && logsData.logs) {
          const logs = logsData.logs;
          const newLogs = logs.substring(lastLogLength);
          
          if (newLogs) {
            process.stdout.write(newLogs);
            lastLogLength = logs.length;
          }
        } else if (logsData.message) {
          // Logs not available yet
          if (lastLogLength === 0) {
            process.stdout.write('.');
          }
        }
      } catch (error) {
        console.error(`\n❌ Error fetching logs: ${error}`);
      }
    }, 2000);
    
    // Stop polling after 30 minutes (safety timeout)
    setTimeout(() => {
      clearInterval(pollInterval);
      console.log(`\n⏱️ Monitoring stopped after 30 minutes`);
    }, 30 * 60 * 1000);
    
  } catch (error) {
    console.error(`❌ Failed to start run:`, error);
    process.exit(1);
  }
}

// Get podcast ID from command line
const podcastId = process.argv[2];

if (!podcastId) {
  console.error('Usage: tsx scripts/start-run-and-monitor.ts <podcastId>');
  process.exit(1);
}

startRunAndMonitor(podcastId).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

