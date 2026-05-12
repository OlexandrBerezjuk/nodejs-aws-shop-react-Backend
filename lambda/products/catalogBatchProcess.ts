import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const snsClient = new SNSClient({ region: process.env.REGION }); // TODO should i pass it every time ?
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      // SQS message body comes as a string (JSON), so we need to parse it
      const productData = JSON.parse(record.body);
      console.log('Processing product:', productData);

      const { title, description, price, count } = productData;
      const productId = uuidv4();

      // Using a transaction to ensure both operations succeed or fail together
      await docClient.send(new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: process.env.PRODUCTS_TABLE,
              Item: { 
                id: productId, 
                title, 
                description, 
                price: Number(price), 
                createdAt: Date.now() 
              },
            },
          },
          {
            Put: {
              TableName: process.env.STOCKS_TABLE,
              Item: {
                product_id: productId,
                count: Number(count)
              },
            },
          },
        ],
      }));
      
      console.log(`Successfully created product ${productId}`);
    }

    const command = new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Subject: "New Products Created",
      Message: `Success! Added ${event.Records.length} new products to the catalog.`,
    });

    await snsClient.send(command);
    console.log("SNS notification sent successfully");
  } catch (error) {
    console.error('Error during batch processing:', error);
    // IMPORTANT: If you throw an error here, SQS will return the message to the queue for retry
    throw error;
  }
};
