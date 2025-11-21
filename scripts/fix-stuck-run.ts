import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const runId = process.argv[2];
if (!runId) {
  console.error('Usage: tsx scripts/fix-stuck-run.ts <runId>');
  process.exit(1);
}

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: 'us-east-1' });

async function checkAudioFile(runId: string): Promise<boolean> {
  try {
    const audioKey = `runs/${runId}/audio.mp3`;
    await s3Client.send(new HeadObjectCommand({
      Bucket: 'podcast-platform-media-098478926952',
      Key: audioKey,
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.Code === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

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
    console.log(`📊 Current stage: ${run.progress?.currentStage || 'N/A'}`);
    
    // Check if audio file exists
    console.log('\n🔍 Checking if audio file exists in S3...');
    const hasAudio = await checkAudioFile(runId);
    console.log(`   Audio file exists: ${hasAudio ? '✅ YES' : '❌ NO'}`);

    if (!hasAudio) {
      console.log('\n❌ Audio file not found. Run may have failed or is still processing.');
      console.log('   Cannot mark as completed without audio file.');
      process.exit(1);
    }

    // Check if all stages up to TTS are completed
    const requiredStages = ['prepare', 'discover', 'disambiguate', 'rank', 'scrape', 'extract', 'summarize', 'contrast', 'outline', 'script', 'qa', 'tts'];
    const allStagesComplete = requiredStages.every(stage => {
      const stageData = run.progress?.stages?.[stage];
      return stageData?.status === 'completed';
    });

    if (!allStagesComplete) {
      console.log('\n❌ Not all required stages are completed. Cannot mark as completed.');
      process.exit(1);
    }

    console.log('\n✅ All required stages completed and audio file exists.');
    console.log('   Marking run as completed...');

    const now = new Date().toISOString();
    const updatedRun = {
      ...run,
      status: 'completed',
      finishedAt: run.finishedAt || now,
      updatedAt: now,
      progress: {
        ...run.progress,
        currentStage: 'package',
        stages: {
          ...run.progress?.stages,
          package: {
            status: 'completed',
            startedAt: run.progress?.stages?.tts?.completedAt || now,
            completedAt: now,
          },
        },
      },
      output: {
        ...run.output,
        episodeId: runId,
        episodeTitle: run.output?.episodeTitle || `Episode ${new Date(now).toLocaleDateString()}`,
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

