import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const seedData = async () => {
  const products = [
    { id: uuidv4(), title: "MacBook Pro", price: 2500, description: "M3 Max Chip", createdAt: Date.now() },
    { id: uuidv4(), title: "iPad Pro", price: 1100, description: "OLED Display", createdAt: Date.now() },
    { id: uuidv4(), title: "iPhone 15", price: 999, description: "Titanium", createdAt: Date.now() }
  ];

  const productEntries = products.map(p => ({
    PutRequest: { Item: p }
  }));

  const stockEntries = products.map(p => ({
    PutRequest: { 
      Item: { product_id: p.id, count: Math.floor(Math.random() * 50) } 
    }
  }));

  try {
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        'products': productEntries,
        'stocks': stockEntries
      }
    }));
    console.log("✅ Database seeded successfully!");
  } catch (err) {
    console.error("❌ Error seeding database:", err);
  }
};

seedData();