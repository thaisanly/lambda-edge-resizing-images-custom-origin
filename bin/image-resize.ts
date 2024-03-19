#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImageResizeStack } from '../lib/image-resize-stack';

const app = new cdk.App();

/**
 * Production
 */
new ImageResizeStack(app, 'ImageResizeStackProd', 'prod', {
  env: {region: 'ap-southeast-1'},
});

/**
 * Staging
 */
new ImageResizeStack(app, 'ImageResizeStackStaging', 'staging', {
  env: {region: 'ap-southeast-1'},
});