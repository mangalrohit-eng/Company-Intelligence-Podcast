import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const runId = process.argv[2];
if (!runId) {
  console.error('Usage: tsx scripts/check-run-status.ts <runId>');
  process.exit(1);
}

const client = new DynamoDBClient({ region: 'us-east-1' });
const doc = DynamoDBDocumentClient.from(client);

async function checkRun() {
  try {
    const result = await doc.send(
      new GetCommand({
        TableName: 'runs',
        Key: { id: runId },
      })
    );

    const run = result.Item;
    if (!run) {
      console.error(`Run ${runId} not found`);
      process.exit(1);
    }

    console.log('📊 Run Status:');
    console.log(`   ID: ${run.id}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Podcast ID: ${run.podcastId}`);
    console.log(`   Started: ${run.startedAt}`);
    console.log(`   Finished: ${run.finishedAt || 'Not finished'}`);
    console.log(`   Current Stage: ${run.progress?.currentStage || 'N/A'}`);
    console.log('');
    
    if (run.progress?.stages) {
      console.log('📋 Stage Status:');
      const stages = ['prepare', 'discover', 'disambiguate', 'rank', 'scrape', 'extract', 'summarize', 'contrast', 'outline', 'script', 'qa', 'tts', 'package'];
      stages.forEach(stage => {
        const stageData = run.progress.stages[stage];
        if (stageData) {
          const status = stageData.status || 'unknown';
          const started = stageData.startedAt ? new Date(stageData.startedAt).toLocaleString() : 'Not started';
          const completed = stageData.completedAt ? new Date(stageData.completedAt).toLocaleString() : 'Not completed';
          console.log(`   ${stage}: ${status} (Started: ${started}, Completed: ${completed})`);
        }
      });
    }
    
    console.log('');
    if (run.output) {
      console.log('📦 Output:');
      console.log(JSON.stringify(run.output, null, 2));
    }
    
    if (run.error) {
      console.log('');
      console.log('❌ Error:');
      console.log(`   ${run.error}`);
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRun();
