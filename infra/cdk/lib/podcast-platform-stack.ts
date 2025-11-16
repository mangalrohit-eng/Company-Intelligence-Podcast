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

    // This would be defined using the ASL JSON file
    // For now, create a placeholder

    const stateMachine = new sfn.StateMachine(this, 'PipelineStateMachine', {
      stateMachineName: 'podcast-pipeline',
      definitionBody: sfn.DefinitionBody.fromFile('../../infra/stepfunctions/podcast_pipeline.asl.json'),
      timeout: cdk.Duration.hours(2),
    });

    // ========================================================================
    // CDN: CloudFront Distribution
    // ========================================================================

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [
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
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
    });

    // ========================================================================
    // Outputs
    // ========================================================================

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'Step Functions State Machine ARN',
    });

    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain',
    });
  }
}

