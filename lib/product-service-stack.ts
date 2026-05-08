import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new NodejsFunction(this, 'getProductsList', {
      entry: path.join(__dirname, '../lambda/products/getProductsList.ts'), 
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        REGION: this.region,
        // Here we can specify DynamoDB table later
      },
    });

    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Product Service',
      // defaultCorsPreflightOptions: {
      //   allowOrigins: apigateway.Cors.ALL_ORIGINS,
      //   allowMethods: apigateway.Cors.ALL_METHODS,
      //   allowHeaders: ['Content-Type', 'Authorization'],
      // },
    });

    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsList));
  }

}