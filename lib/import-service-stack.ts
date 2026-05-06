import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import { Construct } from 'constructs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'UploadedProducts', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT, 
            s3.HttpMethods.GET, 
            s3.HttpMethods.HEAD
          ],
          allowedOrigins: ['https://d22u7d8zzdu0fc.cloudfront.net', 'http://localhost:3000'], // FE Urls
          allowedHeaders: ['*'],
        },
      ],
    });

    const importProductsFile = new NodejsFunction(this, 'importProductsFile', {
      entry: path.join(__dirname, '../lambda/import/importProductsFile.ts'),
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        REGION: this.region,
      },
    });

    // Granting access for Lambda to S3
    bucket.grantWrite(importProductsFile);

    // Creating API Gateway - resource /import with method GET
    const api = new apigateway.RestApi(this, 'ImportApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFile));
  }
}
