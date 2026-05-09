import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  // Making the table a public property of the class so that it can be accessed by other stacks
  public readonly productsTable: dynamodb.Table;
  public readonly stocksTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.productsTable = new dynamodb.Table(this, 'ProductsTable', {
      tableName: 'products',
      // Partition Key - productId
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.NUMBER },

      // For development purposes, we set the removal policy to DESTROY, which means the table will be deleted when the stack is destroyed.
      // In production, you might want to set this to RETAIN to prevent accidental data loss.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      
      // Use PAY_PER_REQUEST, to avoid payment for provisioned capacity during development. In production, you might want to switch to PROVISIONED for cost savings.
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.stocksTable = new dynamodb.Table(this, 'StocksTable', {
      tableName: 'stocks',
      partitionKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Exporting the table names in Outputs so that the import script can read them
    new cdk.CfnOutput(this, 'ProductsTableName', { value: this.productsTable.tableName });
    new cdk.CfnOutput(this, 'StocksTableName', { value: this.stocksTable.tableName });
  }
}
