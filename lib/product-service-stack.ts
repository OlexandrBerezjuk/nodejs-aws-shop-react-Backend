import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

interface ProductServiceStackProps extends cdk.StackProps {
  productsTable: dynamodb.ITable;
  stocksTable: dynamodb.ITable;
}

export class ProductServiceStack extends cdk.Stack {
  private readonly lambdaConfig: Omit<NodejsFunctionProps, 'entry'>;
  public readonly catalogItemsQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: ProductServiceStackProps) {
    super(scope, id, props);

    this.lambdaConfig = {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      environment: {
        REGION: this.region,
        PRODUCTS_TABLE: props.productsTable.tableName,
        STOCKS_TABLE: props.stocksTable.tableName,
      },
    };

    const getProductsList = new NodejsFunction(this, 'getProductsList', {
      entry: path.join(__dirname, '../lambda/products/getProductsList.ts'), 
      ...this.lambdaConfig,
    });

    // Giving the lambda permissions to read from this table
    props.productsTable.grantReadData(getProductsList);
    props.stocksTable.grantReadData(getProductsList);

    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Product Service',
    });

    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsList));   // GET /products


    const getProductsById = new NodejsFunction(this, 'getProductsById', {
      entry: path.join(__dirname, '../lambda/products/getProductsById.ts'),
      ...this.lambdaConfig,
    });

    // Giving the lambda permissions to read from this table
    props.productsTable.grantReadData(getProductsById);
    props.stocksTable.grantReadData(getProductsById);

    const productResource = productsResource.addResource('{productId}');
    productResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsById));    // GET /products/{productId}
    
    
    
    const createProduct = new NodejsFunction(this, 'createProduct', {
      entry: path.join(__dirname, '../lambda/products/createProduct.ts'),
      ...this.lambdaConfig,
    });

    props.productsTable.grantWriteData(createProduct);
    props.stocksTable.grantWriteData(createProduct);

    productsResource.addMethod('POST', new apigateway.LambdaIntegration(createProduct));    // POST /products



    // Instead of a bunch of lines here, you just call "sub-methods"
    // TODO - refactor all lambda and tables creation above into separate methods for better readability and maintainability
    this.catalogItemsQueue = this.createCatalogSQS();
    const productTopic = this.createProductTopic();

    this.createCatalogBatchLambda(props.productsTable, props.stocksTable, this.catalogItemsQueue, productTopic);
  }

  // Private method to create the SQS queue for batch processing
  private createCatalogSQS(): sqs.Queue {
    return new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
    });
  }

  // Private method to create the catalogBatchProcess lambda and set up permissions and trigger
  private createCatalogBatchLambda(productsTable: dynamodb.ITable, stocksTable: dynamodb.ITable, queue: sqs.Queue, topic: sns.ITopic) {
    const catalogBatchProcess = new NodejsFunction(this, 'catalogBatchProcess', {
      entry: path.join(__dirname, '../lambda/products/catalogBatchProcess.ts'),
      ...this.lambdaConfig,
      environment: {
        ...this.lambdaConfig.environment,
        SNS_TOPIC_ARN: topic.topicArn,
      },
    });

    productsTable.grantWriteData(catalogBatchProcess);
    stocksTable.grantWriteData(catalogBatchProcess);

    // Granting Lambda permissions to publish to the SNS topic
    topic.grantPublish(catalogBatchProcess);

    catalogBatchProcess.addEventSource(new SqsEventSource(queue, { batchSize: 5 }));
  }

  // Moving the logic to a separate private method
  private createProductTopic(): sns.ITopic {
    const topic = new sns.Topic(this, 'CreateProductTopic', {
      displayName: 'Product creation notification topic',
      topicName: 'createProductProductTopic'
    });

    topic.addSubscription(new subs.EmailSubscription('berezjukalexandr@gmail.com'));

    return topic;
  }
}
