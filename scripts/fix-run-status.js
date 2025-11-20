import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const runId = process.argv[2];
if (!runId) {
  console.error('Usage: node fix-run-status.js <runId>');
  process.exit(1);
}

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

    // Update run with completed status and output
    const updatedRun = {
      ...run,
      status: 'completed',
      finishedAt: run.finishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      output: {
        audioS3Key: `runs/${runId}/audio.mp3`,
        audioPath: `/api/serve-file/runs/${runId}/audio.mp3`,
      },
    };

    // Update package stage status if not already completed
    if (updatedRun.progress?.stages?.package?.status !== 'completed') {
      if (!updatedRun.progress) {
        updatedRun.progress = { currentStage: 'package', stages: {} };
      }
      if (!updatedRun.progress.stages) {
        updatedRun.progress.stages = {};
      }
      if (!updatedRun.progress.stages.package) {
        updatedRun.progress.stages.package = {};
      }
      updatedRun.progress.stages.package.status = 'completed';
      updatedRun.progress.stages.package.completedAt = updatedRun.progress.stages.package.completedAt || new Date().toISOString();
      updatedRun.progress.currentStage = 'package';
    }

    await docClient.send(
      new PutCommand({
        TableName: 'runs',
        Item: updatedRun,
      })
    );

    console.log(`✅ Fixed run ${runId}:`);
    console.log(`   Status: ${updatedRun.status}`);
    console.log(`   Audio path: ${updatedRun.output.audioPath}`);
    console.log(`   Audio S3 key: ${updatedRun.output.audioS3Key}`);
  } catch (error) {
    console.error('Error fixing run:', error);
    process.exit(1);
  }
}

fixRun();

