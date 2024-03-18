#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImageResizeStack } from '../lib/image-resize-stack';

const app = new cdk.App();
new ImageResizeStack(app, 'ImageResizeStack', {
  env: {region: 'ap-southeast-1'},
});