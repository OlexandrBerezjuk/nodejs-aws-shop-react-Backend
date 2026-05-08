import { products } from './products.mock';

export const handler = async (event: any) => {
  try {
    // Logging event to see incoming parameters in CloudWatch
    console.log("GET product by ID event:", JSON.stringify(event, null, 2));

    // Get ID param from path (pathParameters)
    const { productId } = event.pathParameters || {};

    const product = products.find((p) => p.id === productId);

    if (!product) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: 'Product not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET" 
      },
      body: JSON.stringify(product),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};