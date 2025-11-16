#!/usr/bin/env node
/**
 * CDK App Entry Point
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PodcastPlatformStack } from '../lib/podcast-platform-stack';

const app = new cdk.App();

new PodcastPlatformStack(app, 'PodcastPlatformStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'AI Podcast Platform - Infrastructure',
});

app.synth();

