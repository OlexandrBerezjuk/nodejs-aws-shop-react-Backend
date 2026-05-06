import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import csv from "csv-parser";

const s3Client = new S3Client({ region: process.env.REGION });

export const handler = async (event: S3Event) => {
  console.log({event});

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`Processing file: ${key} from bucket: ${bucket}`);

    const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(getObjectCommand);

    if (!response.Body) continue;

    // Creating promise to handle the stream
    const results: any[] = [];
    await new Promise((resolve, reject) => {
      (response.Body as any)
        .pipe(csv())
        .on("data", (data: any) => {
          console.log("CSV Record:", data); // Logging every record (Task 5.3.3)
          results.push(data);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log(`Finished parsing ${key}. Total records: ${results.length}`);
  }
};