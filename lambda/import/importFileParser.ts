import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { S3Event } from "aws-lambda";
import csv from "csv-parser";

const s3Client = new S3Client({ region: process.env.REGION });
const sqsClient = new SQSClient({ region: process.env.REGION });

export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`Processing file: ${key}`);

    const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) continue;

    // Creating an array to track asynchronous operations
    const sqsPromises: Promise<any>[] = [];

    await new Promise((resolve, reject) => {
      (response.Body as any)
        .pipe(csv())
        .on("data", (data: any) => {
          console.log("Queueing SQS message for:", data.title);

          // Create a promise for sending the message and add it to the array
          const sendPromise = sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.CATALOG_ITEMS_QUEUE_URL,
            MessageBody: JSON.stringify(data),
          })).catch(err => console.error("SQS Send Error:", err));
          
          sqsPromises.push(sendPromise);
        })
        .on("end", async () => {
          try {
            console.log(`Reached end of stream. Waiting for ${sqsPromises.length} messages to be sent...`);

            // IMPORTANT: Wait until all messages are actually sent to SQS
            await Promise.all(sqsPromises);
            
            console.log("All messages sent. Moving file to /parsed...");

            const parsedKey = key.replace("uploaded/", "parsed/");
            await s3Client.send(new CopyObjectCommand({
              Bucket: bucket,
              CopySource: `${bucket}/${key}`,
              Key: parsedKey,
            }));
            await s3Client.send(new DeleteObjectCommand({
              Bucket: bucket,
              Key: key,
            }));
            
            console.log("File successfully moved.");
            resolve(true);
          } catch (err) {
            console.error("Error in end-of-stream processing:", err);
            reject(err);
          }
        })
        .on("error", reject);
    });
  }
};