import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const [productsData, stocksData] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: process.env.PRODUCTS_TABLE })),
      docClient.send(new ScanCommand({ TableName: process.env.STOCKS_TABLE })),
    ]);

    const products = productsData.Items || [];
    const stocks = stocksData.Items || [];

    // Join by ID to combine product details with stock count
    const joinedData = products.map((product) => ({
      ...product,
      count: stocks.find((s) => s.product_id === product.id)?.count || 0,
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(joinedData),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
