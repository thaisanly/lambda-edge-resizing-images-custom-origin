import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class ImageResizeStack extends Stack {
  constructor(scope: Construct, id: string, suffix?: string, props?: StackProps) {
    super(scope, id, props);

    const originName = this.node.tryGetContext('originName') as string

    if (originName == undefined) {
      throw new Error('Context value [originName] is not set')
    }

    const ImageResizeFunction  = new cloudfront.experimental.EdgeFunction(
      this,
        this.getResourceName('ImageResize', suffix),
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../resources')
        ),
        functionName: this.getResourceName("CloudfrontImageResize", suffix),
        handler: 'index.handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 512,
        timeout: Duration.seconds(10),
      }
    );

    const cachePolicy = new cloudfront.CachePolicy(this, this.getResourceName('CachePolicy', suffix), {
      cachePolicyName: this.getResourceName('ImageResize', suffix),
      comment: 'Cache Policy for Image-resize',
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList('width', 'height', 'format'),
      defaultTtl: Duration.days(30),
      minTtl: Duration.days(1),
    });

    new cloudfront.Distribution(this, this.getResourceName('Distribution', suffix), {
      comment: this.getResourceName('CloudfrontImageResize', suffix),
      defaultBehavior: {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cachePolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        origin: new origins.HttpOrigin(originName),
        edgeLambdas: [
          {
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            functionVersion: ImageResizeFunction.currentVersion,
          },
        ],
      },
    });
  }

  getResourceName(name: string, suffix?: string): string
  {
    if (suffix) {
      return name + suffix.charAt(0).toUpperCase() + suffix.slice(1)
    }

    return name;
  }
}
