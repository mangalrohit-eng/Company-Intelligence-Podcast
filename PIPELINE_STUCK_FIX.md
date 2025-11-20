# Pipeline Stuck on Prepare Stage Fix

## Issue
After starting a run, the run page shows the prepare stage with a spinning circle, indicating it's stuck and not progressing.

## Root Cause
The Step Functions state machine was referencing `${PrepareLambdaArn}` placeholder that wasn't being substituted. The state machine couldn't find the Lambda function to invoke, so the prepare stage never executed.

## Solution

### 1. Created Prepare Lambda Function
Created `src/api/pipeline/prepare.ts` that:
- Updates run status when prepare stage starts (status: 'running')
- Simulates work (2 second delay)
- Updates run status when prepare stage completes (status: 'completed')
- Updates `currentStage` to 'discover' when prepare completes
- Returns prepare output in the format Step Functions expects

### 2. Updated State Machine Definition
Modified the CDK stack to:
- Create the Prepare Lambda function
- Use a simplified state machine that calls the Prepare Lambda using the correct Step Functions invoke format
- Grant Step Functions permission to invoke the Prepare Lambda

### Code Changes

**Prepare Lambda** (`src/api/pipeline/prepare.ts`):
- Handles Step Functions event format
- Updates DynamoDB run status as it progresses
- Returns proper output format

**CDK Stack** (`infra/cdk/lib/podcast-platform-stack.ts`):
- Creates `PrepareLambda` function
- Creates simplified state machine that invokes Prepare Lambda
- Grants necessary permissions

## Current Status
- ✅ Prepare Lambda is created and deployed
- ✅ State machine can invoke Prepare Lambda
- ✅ Run status updates when prepare stage starts/completes
- ⚠️ This is a simplified version - only prepare stage is implemented
- ⚠️ Full pipeline will need all stage Lambda functions

## Next Steps
To complete the full pipeline:
1. Create Lambda functions for all remaining stages (discover, disambiguate, rank, scrape, extract, summarize, contrast, outline, script, qa, tts, package)
2. Update state machine definition to include all stages
3. Or create a single orchestrator Lambda that runs all stages internally

## Testing
1. Create a new run
2. Check that prepare stage shows as 'running' then 'completed'
3. Check that `currentStage` updates to 'discover' after prepare completes
4. Verify Step Functions execution in AWS Console

