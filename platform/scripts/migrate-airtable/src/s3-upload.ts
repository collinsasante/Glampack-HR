import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

let client: S3Client | undefined;

function s3(): S3Client {
  if (!client) client = new S3Client({ region: config.awsRegion });
  return client;
}

// Airtable's own attachment URLs (v5.airtableusercontent.com/...) are signed and
// temporary — copying them into Postgres as-is would leave every historical medical
// claim receipt broken once the signature expires. Re-hosting on our own S3 bucket is
// the only way to make them permanent.
export async function reuploadAttachmentToS3(
  sourceUrl: string,
  filename: string,
  contentType: string,
  folder: string
): Promise<{ s3Key: string; url: string }> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to download attachment from ${sourceUrl}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const extension = filename.includes(".") ? filename.split(".").pop() : "bin";
  const s3Key = `${folder}/${randomUUID()}.${extension}`;

  await s3().send(
    new PutObjectCommand({
      Bucket: config.s3BucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const url = `https://${config.s3BucketName}.s3.${config.awsRegion}.amazonaws.com/${s3Key}`;
  return { s3Key, url };
}
