/**
 * Fix run 6dcb0c48-53d3-42c9-9304-3648badbeff5
 * - Mark discover and qa stages as completed
 * - Set run status to completed
 * - Add output with audio path
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

async function fixRun() {
  const runId = '6dcb0c48-53d3-42c9-9304-3648badbeff5';
  
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
      console.error('Run not found');
      return;
    }

    console.log('Current run status:', run.status);
    console.log('Current stages:', Object.keys(run.progress?.stages || {}));

    const now = new Date().toISOString();

    // Update run
    const updatedRun = {
      ...run,
      status: 'completed',
      finishedAt: now,
      updatedAt: now,
      output: {
        audioS3Key: `runs/${runId}/audio.mp3`,
        audioPath: `/api/serve-file/runs/${runId}/audio.mp3`,
        showNotesPath: `runs/${runId}/${runId}_show_notes.md`,
        transcriptTxtPath: `runs/${runId}/${runId}_transcript.txt`,
        transcriptVttPath: `runs/${runId}/${runId}_transcript.vtt`,
        sourcesJsonPath: `runs/${runId}/${runId}_sources.json`,
      },
      progress: {
        ...run.progress,
        currentStage: 'package',
        stages: {
          ...run.progress.stages,
          discover: {
            ...run.progress.stages.discover,
            status: 'completed',
            completedAt: run.progress.stages.discover.completedAt || now,
          },
          qa: {
            ...run.progress.stages.qa,
            status: 'completed',
            completedAt: run.progress.stages.qa.completedAt || now,
          },
          package: {
            ...run.progress.stages.package,
            status: 'completed',
            completedAt: run.progress.stages.package.completedAt || now,
          },
        },
      },
    };

    await docClient.send(
      new PutCommand({
        TableName: 'runs',
        Item: updatedRun,
      })
    );

    console.log('✅ Run fixed successfully');
    console.log('Status:', updatedRun.status);
    console.log('Audio path:', updatedRun.output.audioPath);
    console.log('Discover status:', updatedRun.progress.stages.discover.status);
    console.log('QA status:', updatedRun.progress.stages.qa.status);
  } catch (error) {
    console.error('❌ Failed to fix run:', error);
  }
}

fixRun();

