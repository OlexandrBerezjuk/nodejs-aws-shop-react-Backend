import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  const { productId } = event.pathParameters;

  try {
    // 1. Get product (using Query, because we don't know createdAt)
    const productRes = await docClient.send(new QueryCommand({
      TableName: process.env.PRODUCTS_TABLE,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": productId },
    }));

    const product = productRes.Items?.[0];

    if (!product) {
      return { statusCode: 404, body: JSON.stringify({ message: "Not found" }) };
    }

    // 2. Receive stock count
    const stockRes = await docClient.send(new GetCommand({
      TableName: process.env.STOCKS_TABLE,
      Key: { product_id: productId },
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        ...product,
        count: stockRes.Item?.count || 0,
      }),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};