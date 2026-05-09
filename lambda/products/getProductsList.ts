import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const command = new ScanCommand({
    TableName: process.env.TABLE_NAME, // Table name which we passed in CDK
  });

  const response = await docClient.send(command);

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*", // allow access from any origin
      "Access-Control-Allow-Methods": "GET",
    },
    body: JSON.stringify(response.Items),
  };
};
