import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

interface ProductServiceStackProps extends cdk.StackProps {
  productsTable: dynamodb.ITable;
}

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ProductServiceStackProps) {
    super(scope, id, props);

    const getProductsList = new NodejsFunction(this, 'getProductsList', {
      entry: path.join(__dirname, '../lambda/products/getProductsList.ts'), 
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        REGION: this.region,
        TABLE_NAME: props.productsTable.tableName,
      },
    });

    // Giving the lambda permissions to read from this table
    props.productsTable.grantReadData(getProductsList);

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


    const getProductsById = new NodejsFunction(this, 'getProductsById', {
      entry: path.join(__dirname, '../lambda/products/getProductsById.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        REGION: this.region,
        TABLE_NAME: props.productsTable.tableName,
      },
    });

    // Giving the lambda permissions to read from this table
    props.productsTable.grantReadData(getProductsById);

    const productResource = productsResource.addResource('{productId}');
    productResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsById));
  }

}