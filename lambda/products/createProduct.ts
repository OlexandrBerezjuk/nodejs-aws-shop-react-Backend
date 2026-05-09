import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  try {
    console.log("POST /products event:", JSON.stringify(event));

    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    const { title, description, price, count } = body;

    if (!title || !price || count === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields: title, price, count" }),
      };
    }

    const productId = uuidv4();
    const createdAt = Date.now();

    // Using a transaction to ensure both tables are updated atomically
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE,
            Item: { id: productId, title, description, price, createdAt },
          },
        },
        {
          Put: {
            TableName: process.env.STOCKS_TABLE,
            Item: { product_id: productId, count },
          },
        },
      ],
    }));

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: JSON.stringify({ id: productId, title, description, price, count }),
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};