/**
 * Main CDK Stack for AI Podcast Platform
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class PodcastPlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================================================
    // Storage: S3 Buckets
    // ========================================================================

    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `podcast-platform-media-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const rssBucket = new s3.Bucket(this, 'RssBucket', {
      bucketName: `podcast-platform-rss-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      websiteIndexDocument: 'index.xml',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================================================
    // Database: DynamoDB Tables
    // ========================================================================

    const podcastsTable = new dynamodb.Table(this, 'PodcastsTable', {
      tableName: 'podcasts',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    podcastsTable.addGlobalSecondaryIndex({
      indexName: 'OrgIdIndex',
      partitionKey: { name: 'orgId', type: dynamodb.AttributeType.STRING },
    });

    const runsTable = new dynamodb.Table(this, 'RunsTable', {
      tableName: 'runs',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    runsTable.addGlobalSecondaryIndex({
      indexName: 'PodcastIdIndex',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
    });

    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'run_events',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ts', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    eventsTable.addGlobalSecondaryIndex({
      indexName: 'RunIdIndex',
      partitionKey: { name: 'runId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ts', type: dynamodb.AttributeType.STRING },
    });

    const episodesTable = new dynamodb.Table(this, 'EpisodesTable', {
      tableName: 'episodes',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    episodesTable.addGlobalSecondaryIndex({
      indexName: 'PodcastIdIndex',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
    });

    // Additional tables for podcast configuration
    const podcastConfigsTable = new dynamodb.Table(this, 'PodcastConfigsTable', {
      tableName: 'podcast_configs',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const podcastCompetitorsTable = new dynamodb.Table(this, 'PodcastCompetitorsTable', {
      tableName: 'podcast_competitors',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'companyId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const podcastTopicsTable = new dynamodb.Table(this, 'PodcastTopicsTable', {
      tableName: 'podcast_topics',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'topicId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================================================
    // Auth: Cognito User Pool
    // ========================================================================

    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'podcast-platform-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      customAttributes: {
        'org_id': new cognito.StringAttribute({ minLen: 1, maxLen: 256, mutable: false }),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // ========================================================================
    // Compute: Lambda Functions
    // ========================================================================

    const lambdaEnv = {
      PODCASTS_TABLE: podcastsTable.tableName,
      PODCAST_CONFIGS_TABLE: podcastConfigsTable.tableName,
      PODCAST_COMPETITORS_TABLE: podcastCompetitorsTable.tableName,
      PODCAST_TOPICS_TABLE: podcastTopicsTable.tableName,
      RUNS_TABLE: runsTable.tableName,
      EVENTS_TABLE: eventsTable.tableName,
      RUN_EVENTS_TABLE: eventsTable.tableName, // Alias for runs/events.ts
      EPISODES_TABLE: episodesTable.tableName,
      MEDIA_BUCKET: mediaBucket.bucketName,
      S3_BUCKET_MEDIA: mediaBucket.bucketName, // Alias for episodes/get.ts
      RSS_BUCKET: rssBucket.bucketName,
      CLOUDFRONT_DOMAIN: `https://dhycfwg0k4xij.cloudfront.net`,  // TODO: Make this dynamic
      USER_POOL_ID: userPool.userPoolId,
      // OPENAI_API_KEY: Set this via AWS Console or pass during CDK deploy
      // You can set it via: aws lambda update-function-configuration --function-name pipeline-orchestrator --environment "Variables={OPENAI_API_KEY=sk-...}"
    };

    const createPodcastLambda = new NodejsFunction(this, 'CreatePodcastLambda', {
      functionName: 'podcast-create',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/podcasts/create.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    podcastsTable.grantWriteData(createPodcastLambda);
    podcastConfigsTable.grantWriteData(createPodcastLambda);
    podcastCompetitorsTable.grantWriteData(createPodcastLambda);
    podcastTopicsTable.grantWriteData(createPodcastLambda);

    const listPodcastsLambda = new NodejsFunction(this, 'ListPodcastsLambda', {
      functionName: 'podcast-list',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/podcasts/list.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    podcastsTable.grantReadData(listPodcastsLambda);

    // Competitor suggestions Lambda
    const suggestCompetitorsLambda = new NodejsFunction(this, 'SuggestCompetitorsLambda', {
      functionName: 'competitors-suggest',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/competitors/suggest.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'], // AWS SDK is available in Lambda runtime
      },
    });

    const voicePreviewLambda = new NodejsFunction(this, 'VoicePreviewLambda', {
      functionName: 'voice-preview',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/voice/preview.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'], // AWS SDK is available in Lambda runtime
      },
    });

    // ========================================================================
    // API Gateway: HTTP API
    // ========================================================================

    const httpApi = new apigatewayv2.HttpApi(this, 'PodcastApi', {
      apiName: 'podcast-platform-api',
      description: 'AI Podcast Platform REST API',
      corsPreflight: {
        allowOrigins: ['*'], // In production, restrict to your domain
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Create JWT authorizer for Cognito
    const authorizer = new HttpJwtAuthorizer('CognitoAuthorizer', 
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      }
    );

    // Add routes for Lambda functions
    const createPodcastIntegration = new HttpLambdaIntegration(
      'CreatePodcastIntegration',
      createPodcastLambda
    );

    const listPodcastsIntegration = new HttpLambdaIntegration(
      'ListPodcastsIntegration',
      listPodcastsLambda
    );

    httpApi.addRoutes({
      path: '/podcasts',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: createPodcastIntegration,
      authorizer: authorizer,
    });

    httpApi.addRoutes({
      path: '/podcasts',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listPodcastsIntegration,
      authorizer: authorizer,
    });

    const suggestCompetitorsIntegration = new HttpLambdaIntegration(
      'SuggestCompetitorsIntegration',
      suggestCompetitorsLambda
    );

    httpApi.addRoutes({
      path: '/competitors/suggest',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: suggestCompetitorsIntegration,
    });

    const voicePreviewIntegration = new HttpLambdaIntegration(
      'VoicePreviewIntegration',
      voicePreviewLambda
    );

    httpApi.addRoutes({
      path: '/voice/preview',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: voicePreviewIntegration,
    });

    // ========================================================================
    // Networking: VPC for ECS
    // ========================================================================

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'podcast-platform-cluster',
    });

    // ========================================================================
    // Step Functions: Pipeline State Machine
    // ========================================================================

    // Create IAM role for Step Functions with necessary permissions
    const stateMachineRole = new iam.Role(this, 'StateMachineRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      description: 'Execution role for podcast pipeline state machine',
    });

    // Grant permissions to invoke Lambda functions
    stateMachineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: ['*'], // Will be restricted to specific functions in production
    }));

    // Grant permissions to run ECS tasks
    stateMachineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecs:RunTask',
        'ecs:StopTask',
        'ecs:DescribeTasks',
      ],
      resources: ['*'],
    }));

    // Grant permissions to pass IAM roles to ECS tasks
    stateMachineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['iam:PassRole'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'iam:PassedToService': 'ecs-tasks.amazonaws.com',
        },
      },
    }));

    // Grant permissions to create and manage EventBridge rules (for ECS sync integration)
    stateMachineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'events:PutTargets',
        'events:PutRule',
        'events:DescribeRule',
        'events:DeleteRule',
        'events:RemoveTargets',
      ],
      resources: ['*'],
    }));

    // Create Pipeline Orchestrator Lambda - runs the full pipeline
    const orchestratorLambda = new NodejsFunction(this, 'OrchestratorLambda', {
      functionName: 'pipeline-orchestrator',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/pipeline/orchestrator.ts',
      handler: 'handler',
      environment: {
        ...lambdaEnv,
        // OPENAI_API_KEY is NOT set here - it should be set via AWS Console to avoid being overwritten on CDK deploy
        // Lambda Console: Configuration > Environment variables > Edit
        // This way, CDK deployments won't overwrite the manually set value
      },
      timeout: cdk.Duration.minutes(15), // Lambda max timeout is 15 minutes
      memorySize: 3008, // More memory for complex operations
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*', 'playwright', 'chromium-bidi', '@playwright/browser-chromium'],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          beforeInstall(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            // Create a stub for playwright modules to prevent runtime errors
            return [
              `echo "module.exports = {};" > "${outputDir}/playwright-stub.js"`,
            ];
          },
        },
      },
    });

    // Grant permissions to orchestrator
    runsTable.grantReadWriteData(orchestratorLambda);
    podcastsTable.grantReadData(orchestratorLambda);
    podcastConfigsTable.grantReadData(orchestratorLambda);
    episodesTable.grantReadWriteData(orchestratorLambda);
    mediaBucket.grantReadWrite(orchestratorLambda);
    rssBucket.grantReadWrite(orchestratorLambda);
    // Note: OPENAI_API_KEY should be set via AWS Console for security
    // Or pass it during deploy: cdk deploy -c openaiApiKey=sk-...

    // Create state machine that calls orchestrator Lambda
    const stateMachine = new sfn.StateMachine(this, 'PipelineStateMachine', {
      stateMachineName: 'podcast-pipeline',
      definitionBody: sfn.DefinitionBody.fromString(
        JSON.stringify({
          Comment: 'AI Podcast Generation Pipeline - Full Orchestrator',
          StartAt: 'ExecutePipeline',
          States: {
            ExecutePipeline: {
              Type: 'Task',
              Resource: 'arn:aws:states:::lambda:invoke',
              Parameters: {
                'FunctionName': orchestratorLambda.functionArn,
                'Payload.$': '$',
              },
              ResultPath: '$.pipelineOutput',
              ResultSelector: {
                'output.$': '$.Payload',
              },
              Retry: [
                {
                  ErrorEquals: ['States.TaskFailed', 'States.Timeout'],
                  IntervalSeconds: 5,
                  MaxAttempts: 1,
                  BackoffRate: 2.0,
                },
              ],
              Catch: [
                {
                  ErrorEquals: ['States.ALL'],
                  ResultPath: '$.error',
                  Next: 'HandleFailure',
                },
              ],
              Next: 'Success',
            },
            Success: {
              Type: 'Succeed',
            },
            HandleFailure: {
              Type: 'Fail',
              Error: 'PipelineExecutionFailed',
              Cause: 'Pipeline execution failed',
            },
          },
        })
      ),
      timeout: cdk.Duration.hours(2),
      role: stateMachineRole,
    });

    orchestratorLambda.grantInvoke(stateMachineRole);

    // Create Run Lambda (needs state machine ARN)
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

    runsTable.grantReadWriteData(createRunLambda);
    podcastsTable.grantReadData(createRunLambda);
    podcastConfigsTable.grantReadData(createRunLambda);
    podcastTopicsTable.grantReadData(createRunLambda);
    podcastCompetitorsTable.grantReadData(createRunLambda);
    stateMachine.grantStartExecution(createRunLambda);

    // Get Run Lambda
    const getRunLambda = new NodejsFunction(this, 'GetRunLambda', {
      functionName: 'run-get',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/runs/get.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    runsTable.grantReadData(getRunLambda);
    podcastsTable.grantReadData(getRunLambda);

    // List Runs Lambda
    const listRunsLambda = new NodejsFunction(this, 'ListRunsLambda', {
      functionName: 'run-list',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/runs/list.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    runsTable.grantReadData(listRunsLambda);
    podcastsTable.grantReadData(listRunsLambda);

    // Get Run Events Lambda
    const getRunEventsLambda = new NodejsFunction(this, 'GetRunEventsLambda', {
      functionName: 'run-events',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/runs/events.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    eventsTable.grantReadData(getRunEventsLambda);

    // Get Podcast Lambda
    const getPodcastLambda = new NodejsFunction(this, 'GetPodcastLambda', {
      functionName: 'podcast-get',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/podcasts/get.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    podcastsTable.grantReadData(getPodcastLambda);

    // Get Episode Lambda
    const getEpisodeLambda = new NodejsFunction(this, 'GetEpisodeLambda', {
      functionName: 'episode-get',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/episodes/get.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    episodesTable.grantReadData(getEpisodeLambda);
    mediaBucket.grantRead(getEpisodeLambda);

    // List Episodes Lambda
    const listEpisodesLambda = new NodejsFunction(this, 'ListEpisodesLambda', {
      functionName: 'episode-list',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/episodes/list.ts',
      handler: 'handler',
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    episodesTable.grantReadData(listEpisodesLambda);
    podcastsTable.grantReadData(listEpisodesLambda);

    // Add routes for creating runs
    const createRunIntegration = new HttpLambdaIntegration(
      'CreateRunIntegration',
      createRunLambda
    );

    httpApi.addRoutes({
      path: '/podcasts/{id}/runs',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: createRunIntegration,
      authorizer: authorizer,
    });

    // Add routes for getting/listing runs
    const getRunIntegration = new HttpLambdaIntegration(
      'GetRunIntegration',
      getRunLambda
    );

    httpApi.addRoutes({
      path: '/runs/{id}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: getRunIntegration,
      authorizer: authorizer,
    });

    const listRunsIntegration = new HttpLambdaIntegration(
      'ListRunsIntegration',
      listRunsLambda
    );

    httpApi.addRoutes({
      path: '/podcasts/{id}/runs',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listRunsIntegration,
      authorizer: authorizer,
    });

    const getRunEventsIntegration = new HttpLambdaIntegration(
      'GetRunEventsIntegration',
      getRunEventsLambda
    );

    httpApi.addRoutes({
      path: '/runs/{id}/events',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: getRunEventsIntegration,
      authorizer: authorizer,
    });

    // Add route for getting podcast
    const getPodcastIntegration = new HttpLambdaIntegration(
      'GetPodcastIntegration',
      getPodcastLambda
    );

    httpApi.addRoutes({
      path: '/podcasts/{id}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: getPodcastIntegration,
      authorizer: authorizer,
    });

    // Add routes for episodes
    const getEpisodeIntegration = new HttpLambdaIntegration(
      'GetEpisodeIntegration',
      getEpisodeLambda
    );

    httpApi.addRoutes({
      path: '/episodes/{id}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: getEpisodeIntegration,
      authorizer: authorizer,
    });

    const listEpisodesIntegration = new HttpLambdaIntegration(
      'ListEpisodesIntegration',
      listEpisodesLambda
    );

    httpApi.addRoutes({
      path: '/podcasts/{id}/episodes',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listEpisodesIntegration,
      authorizer: authorizer,
    });

    // Resume Run Lambda
    const resumeRunLambda = new NodejsFunction(this, 'ResumeRunLambda', {
      functionName: 'run-resume',
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: '../../src/api/runs/resume.ts',
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

    runsTable.grantReadWriteData(resumeRunLambda);
    podcastsTable.grantReadData(resumeRunLambda);
    podcastConfigsTable.grantReadData(resumeRunLambda);
    stateMachine.grantStartExecution(resumeRunLambda);

    const resumeRunIntegration = new HttpLambdaIntegration(
      'ResumeRunIntegration',
      resumeRunLambda
    );

    httpApi.addRoutes({
      path: '/podcasts/{id}/runs/{runId}/resume',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: resumeRunIntegration,
      authorizer: authorizer,
    });

    // ========================================================================
    // Frontend: S3 Bucket for Next.js Static Export
    // ========================================================================

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `podcast-platform-frontend-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // For SPA routing
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================================================
    // CDN: CloudFront Distribution
    // ========================================================================

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: frontendBucket,
          },
          behaviors: [{
            isDefaultBehavior: true,
            defaultTtl: cdk.Duration.days(1),
            maxTtl: cdk.Duration.days(7),
            minTtl: cdk.Duration.minutes(0),
            compress: true,
            allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
            cachedMethods: cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD,
            forwardedValues: {
              queryString: false,
              cookies: {
                forward: 'none',
              },
            },
          }],
        },
        {
          s3OriginSource: {
            s3BucketSource: mediaBucket,
          },
          behaviors: [{ isDefaultBehavior: false, pathPattern: '/media/*' }],
        },
        {
          s3OriginSource: {
            s3BucketSource: rssBucket,
          },
          behaviors: [{ isDefaultBehavior: false, pathPattern: '/rss/*' }],
        },
      ],
      errorConfigurations: [
        {
          errorCode: 403,
          responseCode: 200,
          responsePagePath: '/index.html', // For SPA routing
        },
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html', // For SPA routing
        },
      ],
    });

    // ========================================================================
    // Outputs
    // ========================================================================

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'API Gateway HTTP API Endpoint',
      exportName: 'PodcastPlatformApiUrl',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'PodcastPlatformUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'PodcastPlatformUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'Step Functions State Machine ARN',
      exportName: 'PodcastPlatformStateMachineArn',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
      exportName: 'PodcastPlatformFrontendBucket',
    });

    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
      exportName: 'PodcastPlatformWebsiteUrl',
    });
  }
}

