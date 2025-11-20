# Run Status Stuck on Pending Fix

## Issue
After creating a run, the run page opens but is stuck showing "pending" status, even though Step Functions execution was started.

## Root Cause
The Lambda function was creating runs with status 'pending' and starting Step Functions execution, but never updating the run status to 'running' after successfully starting the execution. The run would remain at 'pending' indefinitely.

## Solution
Updated `src/api/runs/create.ts` to:
1. **Update run status to 'running'** after successfully starting Step Functions execution
2. **Set `startedAt` timestamp** when the run starts
3. **Store `executionArn`** for tracking Step Functions execution
4. **Update prepare stage status** to 'running' with `startedAt` timestamp

### Code Changes

```typescript
// Start Step Functions execution
const result = await sfnClient.send(
  new StartExecutionCommand({
    stateMachineArn: process.env.STATE_MACHINE_ARN!,
    name: runId,
    input: JSON.stringify(pipelineInput),
  })
);

// Update run status to 'running' and store executionArn
run.status = 'running';
run.startedAt = now;
run.executionArn = result.executionArn;
run.progress.stages.prepare.status = 'running';
run.progress.stages.prepare.startedAt = now;

// Persist updated run to DynamoDB
await docClient.send(
  new PutCommand({
    TableName: process.env.RUNS_TABLE!,
    Item: run,
  })
);
```

## Result
- ✅ Run status is immediately updated to 'running' after Step Functions execution starts
- ✅ Run shows as 'running' in the UI instead of stuck on 'pending'
- ✅ Execution ARN is stored for tracking Step Functions execution
- ✅ Prepare stage is marked as 'running' with timestamp

## Next Steps (Future Improvements)
For a more complete solution, consider:
1. **Poll Step Functions execution status** to update run status based on actual execution state
2. **Handle Step Functions failures** and update run status to 'failed' if execution fails
3. **Update stage progress** based on Step Functions execution events
4. **Add EventBridge integration** to automatically update DynamoDB when Step Functions state changes

## Testing
1. Create a new run in Amplify
2. Check that the run status immediately shows as 'running' (not 'pending')
3. Verify that the prepare stage shows as 'running'
4. Check Step Functions console to verify execution is actually running

