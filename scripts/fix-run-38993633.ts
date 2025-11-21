import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const runId = '38993633-d525-467d-8806-2508b31fae72';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function fixRun() {
  try {
    // Get current run
    const getResult = await docClient.send(
      new GetCommand({
        TableName: 'runs',
        Key: { id: runId },
      })
    );

    const run = getResult.Item;
    if (!run) {
      console.error(`Run ${runId} not found`);
      process.exit(1);
    }

    console.log(`📊 Current run status: ${run.status}`);
    
    // Based on logs, the pipeline completed at 04:24:42
    // Audio file was saved: runs/38993633-d525-467d-8806-2508b31fae72/audio.mp3
    // Episode record was created
    
    const now = new Date().toISOString();
    const finishedAt = '2025-11-21T04:24:43.000Z'; // From logs
    
    const updatedRun = {
      ...run,
      status: 'completed',
      finishedAt: finishedAt,
      updatedAt: now,
      progress: {
        ...run.progress,
        currentStage: 'package',
        stages: {
          ...run.progress?.stages,
          package: {
            status: 'completed',
            startedAt: '2025-11-21T04:24:42.000Z',
            completedAt: finishedAt,
          },
        },
      },
      output: {
        ...run.output,
        episodeId: runId,
        episodeTitle: run.output?.episodeTitle || `Episode ${new Date(finishedAt).toLocaleDateString()}`,
        audioS3Key: `runs/${runId}/audio.mp3`,
        audioPath: `/api/serve-file/runs/${runId}/audio.mp3`,
      },
    };

    await docClient.send(
      new PutCommand({
        TableName: 'runs',
        Item: updatedRun,
      })
    );

    console.log('\n✅ Run fixed successfully!');
    console.log(`   Status: ${updatedRun.status}`);
    console.log(`   Finished: ${updatedRun.finishedAt}`);
    console.log(`   Audio: ${updatedRun.output.audioPath}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixRun();

