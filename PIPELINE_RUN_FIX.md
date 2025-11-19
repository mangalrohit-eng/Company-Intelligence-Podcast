# Pipeline Run Fix - API Endpoint Added

## Issue
When trying to start a pipeline run for a podcast, the frontend was getting a "Failed to fetch" error. This was because the API endpoint `POST /podcasts/{id}/runs` was not configured in API Gateway.

## Root Cause
The Lambda function for creating runs (`src/api/runs/create.ts`) existed, but it was not:
1. Added to the CDK stack as a Lambda function
2. Connected to API Gateway with a route
3. Granted necessary permissions (DynamoDB, Step Functions)

## Solution
Added the following to `infra/cdk/lib/podcast-platform-stack.ts`:

### 1. Created the Lambda Function
```typescript
const createRunLambda = new NodejsFunction(this, 'CreateRunLambda', {
  functionName: 'run-create',
  runtime: lambda.Runtime.NODEJS_18_X,
  entry: '../../src/api/runs/create.ts',
  handler: 'handler',
  environment: {
    ...lambdaEnv,
    STATE_MACHINE_ARN: stateMachine.stateMachineArn,
  },
  timeout: cdk.Duration.seconds(30),
  bundling: {
    minify: false,
    sourceMap: true,
    externalModules: ['@aws-sdk/*'],
  },
});
```

### 2. Granted Permissions
- Read/Write access to `runsTable`
- Read access to `podcastsTable` and `podcastConfigsTable`
- Permission to start Step Functions executions

### 3. Added API Gateway Route
```typescript
httpApi.addRoutes({
  path: '/podcasts/{id}/runs',
  methods: [apigatewayv2.HttpMethod.POST],
  integration: createRunIntegration,
  authorizer: authorizer,
});
```

## Deployment
The Lambda function and API route have been deployed to AWS. The endpoint is now available at:
```
POST https://{API_GATEWAY_URL}/podcasts/{podcastId}/runs
```

## Testing
1. Go to your Amplify-deployed frontend
2. Navigate to a podcast
3. Click "Run Now" to start a pipeline run
4. The request should now succeed and create a new run in DynamoDB and start a Step Functions execution

## Next Steps
If you encounter any issues:
1. Check CloudWatch logs for the `run-create` Lambda function
2. Verify the Step Functions state machine ARN is correctly set in the Lambda environment
3. Ensure the podcast exists and the user has access to it

