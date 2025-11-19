/**
 * Test script to verify the logs API endpoint works
 * Usage: tsx scripts/test-logs-endpoint.ts <runId>
 */

import 'dotenv/config';

async function testLogsEndpoint(runId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  console.log(`🧪 Testing logs endpoint for run: ${runId}`);
  console.log(`📡 API URL: ${baseUrl}\n`);
  
  try {
    const response = await fetch(`${baseUrl}/api/runs/${runId}/logs`);
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    
    if (response.ok) {
      if (data.logs) {
        console.log(`\n✅ Logs retrieved successfully!`);
        console.log(`📊 Log length: ${data.logs.length} characters`);
        console.log(`📝 Log lines: ${data.logs.split('\n').length}`);
        console.log(`\n--- Last 10 lines ---`);
        const lines = data.logs.split('\n');
        lines.slice(-10).forEach(line => console.log(line));
      } else {
        console.log(`\n⚠️ No logs available yet (logs may not have started)`);
      }
    } else {
      console.log(`\n❌ Error: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`\n❌ Failed to fetch logs:`, error);
    process.exit(1);
  }
}

// Get run ID from command line
const runId = process.argv[2];

if (!runId) {
  console.error('Usage: tsx scripts/test-logs-endpoint.ts <runId>');
  console.error('Example: tsx scripts/test-logs-endpoint.ts run_1763580172829_gnzshm');
  process.exit(1);
}

testLogsEndpoint(runId);

