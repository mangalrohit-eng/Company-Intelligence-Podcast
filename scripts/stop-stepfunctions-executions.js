/**
 * Stop All Running Step Functions Executions
 */

import { SFNClient, ListExecutionsCommand, StopExecutionCommand } from '@aws-sdk/client-sfn';

const REGION = process.env.AWS_REGION || 'us-east-1';
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN || 'arn:aws:states:us-east-1:098478926952:stateMachine:podcast-pipeline';

const sfnClient = new SFNClient({ region: REGION });

async function stopAllExecutions() {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
  
  console.log('=========================================');
  console.log('Stop All Running Step Functions Executions');
  console.log('=========================================');
  console.log('');
  
  if (dryRun) {
    console.log('[DRY RUN MODE] - No changes will be made');
    console.log('');
  }
  
  console.log(`State Machine: ${STATE_MACHINE_ARN}`);
  console.log('');
  
  // List all running executions
  const runningExecutions = [];
  let nextToken = undefined;
  
  do {
    const result = await sfnClient.send(
      new ListExecutionsCommand({
        stateMachineArn: STATE_MACHINE_ARN,
        statusFilter: 'RUNNING',
        maxResults: 100,
        nextToken,
      })
    );
    
    if (result.executions) {
      runningExecutions.push(...result.executions);
    }
    
    nextToken = result.nextToken;
  } while (nextToken);
  
  console.log(`Found ${runningExecutions.length} running executions`);
  console.log('');
  
  if (runningExecutions.length === 0) {
    console.log('No running executions found. Nothing to do.');
    return;
  }
  
  // Display executions
  console.log('Running executions:');
  runningExecutions.forEach(exec => {
    console.log(`  - ${exec.executionArn} (Started: ${exec.startDate})`);
  });
  console.log('');
  
  if (dryRun) {
    console.log(`[DRY RUN] Would stop ${runningExecutions.length} executions`);
    return;
  }
  
  // Stop executions
  console.log('Stopping executions...');
  console.log('');
  
  let stoppedCount = 0;
  let errorCount = 0;
  
  for (const exec of runningExecutions) {
    try {
      await sfnClient.send(
        new StopExecutionCommand({
          executionArn: exec.executionArn,
          error: 'StoppedByUser',
          cause: 'Stopped by cleanup script',
        })
      );
      stoppedCount++;
      console.log(`  [SUCCESS] Stopped ${exec.executionArn}`);
    } catch (error) {
      errorCount++;
      console.error(`  [ERROR] Failed to stop ${exec.executionArn}:`, error.message);
    }
  }
  
  console.log('');
  console.log('=========================================');
  console.log('Summary:');
  console.log(`  Stopped: ${stoppedCount}`);
  console.log(`  Errors:  ${errorCount}`);
  console.log('=========================================');
}

stopAllExecutions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

