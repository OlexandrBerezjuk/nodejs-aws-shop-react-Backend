import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

interface ProductServiceStackProps extends cdk.StackProps {
  productsTable: dynamodb.ITable;
  stocksTable: dynamodb.ITable;
}

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ProductServiceStackProps) {
    super(scope, id, props);

    const lambdaConfig = {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      environment: {
        REGION: this.region,
        PRODUCTS_TABLE: props.productsTable.tableName,
        STOCKS_TABLE: props.stocksTable.tableName,
      },
    };

    const getProductsList = new NodejsFunction(this, 'getProductsList', {
      entry: path.join(__dirname, '../lambda/products/getProductsList.ts'), 
      ...lambdaConfig,
    });

    // Giving the lambda permissions to read from this table
    props.productsTable.grantReadData(getProductsList);
    props.stocksTable.grantReadData(getProductsList);

    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Product Service',
    });

    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsList));


    const getProductsById = new NodejsFunction(this, 'getProductsById', {
      entry: path.join(__dirname, '../lambda/products/getProductsById.ts'),
      ...lambdaConfig,
    });

    // Giving the lambda permissions to read from this table
    props.productsTable.grantReadData(getProductsById);
    props.stocksTable.grantReadData(getProductsById);

    const productResource = productsResource.addResource('{productId}');
    productResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsById));
  }

}