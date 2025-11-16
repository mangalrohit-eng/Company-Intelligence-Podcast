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
      RUNS_TABLE: runsTable.tableName,
      EVENTS_TABLE: eventsTable.tableName,
      EPISODES_TABLE: episodesTable.tableName,
      MEDIA_BUCKET: mediaBucket.bucketName,
      RSS_BUCKET: rssBucket.bucketName,
      USER_POOL_ID: userPool.userPoolId,
    };

    const createPodcastLambda = new lambda.Function(this, 'CreatePodcastLambda', {
      functionName: 'podcast-create',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('../../src/api/podcasts'),
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
    });

    podcastsTable.grantWriteData(createPodcastLambda);

    const listPodcastsLambda = new lambda.Function(this, 'ListPodcastsLambda', {
      functionName: 'podcast-list',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('../../src/api/podcasts'),
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
    });

    podcastsTable.grantReadData(listPodcastsLambda);

    // New Lambda functions
    const listRunsLambda = new lambda.Function(this, 'ListRunsLambda', {
      functionName: 'runs-list',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('../../src/api/runs'),
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
    });

    runsTable.grantReadData(listRunsLambda);
    eventsTable.grantReadData(listRunsLambda);

    const suggestCompetitorsLambda = new lambda.Function(this, 'SuggestCompetitorsLambda', {
      functionName: 'competitors-suggest',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'suggest.handler',
      code: lambda.Code.fromAsset('../../src/api/competitors'),
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
    });

    const voicePreviewLambda = new lambda.Function(this, 'VoicePreviewLambda', {
      functionName: 'voice-preview',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'preview.handler',
      code: lambda.Code.fromAsset('../../src/api/voice'),
      environment: lambdaEnv,
      timeout: cdk.Duration.seconds(30),
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
    });

    httpApi.addRoutes({
      path: '/podcasts',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listPodcastsIntegration,
    });

    const listRunsIntegration = new HttpLambdaIntegration(
      'ListRunsIntegration',
      listRunsLambda
    );

    httpApi.addRoutes({
      path: '/runs',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listRunsIntegration,
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

    const stateMachine = new sfn.StateMachine(this, 'PipelineStateMachine', {
      stateMachineName: 'podcast-pipeline',
      definitionBody: sfn.DefinitionBody.fromFile('../../infra/stepfunctions/podcast_pipeline.asl.json'),
      timeout: cdk.Duration.hours(2),
      role: stateMachineRole,
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
          behaviors: [{ isDefaultBehavior: true }],
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

