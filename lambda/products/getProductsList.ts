import { products } from './products.mock';

export const handler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*", // allow access from any origin
      "Access-Control-Allow-Methods": "GET",
    },
    body: JSON.stringify(products),
  };
};
