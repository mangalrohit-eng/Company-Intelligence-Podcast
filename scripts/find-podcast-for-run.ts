/**
 * Find podcast ID for a run by checking all podcasts
 * Usage: tsx scripts/find-podcast-for-run.ts <runId>
 */

import 'dotenv/config';

async function findPodcastForRun(runId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  console.log(`🔍 Finding podcast for run: ${runId}`);
  console.log(`📡 API URL: ${baseUrl}\n`);
  
  try {
    // Fetch all podcasts
    const response = await fetch(`${baseUrl}/api/podcasts`);
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`❌ Error fetching podcasts: ${data.error || 'Unknown error'}`);
      process.exit(1);
    }
    
    const podcasts = data.podcasts || [];
    console.log(`📊 Found ${podcasts.length} podcasts\n`);
    
    // Check each podcast for the run
    for (const podcast of podcasts) {
      try {
        const runsResponse = await fetch(`${baseUrl}/api/podcasts/${podcast.id}/runs`);
        if (runsResponse.ok) {
          const runsData = await runsResponse.ok ? await runsResponse.json() : null;
          const runs = Array.isArray(runsData) ? runsData : (runsData?.runs || []);
          
          const run = runs.find((r: any) => r.id === runId);
          if (run) {
            console.log(`✅ Found run in podcast: ${podcast.id}`);
            console.log(`   Podcast: ${podcast.title || podcast.id}`);
            console.log(`   Run Status: ${run.status}`);
            console.log(`   Current Stage: ${run.progress?.currentStage || 'unknown'}`);
            console.log(`\n📋 Run Details:`);
            console.log(JSON.stringify(run, null, 2));
            return podcast.id;
          }
        }
      } catch (err) {
        // Continue to next podcast
      }
    }
    
    console.log(`❌ Run not found in any podcast`);
    process.exit(1);
    
  } catch (error) {
    console.error(`\n❌ Failed to find podcast:`, error);
    process.exit(1);
  }
}

const runId = process.argv[2];

if (!runId) {
  console.error('Usage: tsx scripts/find-podcast-for-run.ts <runId>');
  process.exit(1);
}

findPodcastForRun(runId);

