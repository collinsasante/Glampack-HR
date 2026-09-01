import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

const s3 = new S3Client({ region: env.AWS_REGION });

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB, matches the current Cloudinary limit

export interface PresignedUpload {
  // POST-policy upload: the client does a multipart/form-data POST to `uploadUrl`
  // with these exact `fields` (plus the file itself as the final field, named "file").
  uploadUrl: string;
  fields: Record<string, string>;
  s3Key: string;
  // Not directly loadable — the bucket is private. Kept only as a stable,
  // human-readable reference (e.g. for stored audit fields); real access
  // always goes through presignGet() at read time.
  publicUrl: string;
}

export async function presignUpload(folder: string, contentType: string): Promise<PresignedUpload> {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const extension = contentType.split("/")[1];
  const s3Key = `${folder}/${randomUUID()}.${extension}`;
  const publicUrl = `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${s3Key}`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: env.S3_BUCKET_NAME,
    Key: s3Key,
    Fields: { "Content-Type": contentType },
    Conditions: [["content-length-range", 0, MAX_UPLOAD_BYTES], ["eq", "$Content-Type", contentType]],
    Expires: 300, // 5 minutes to complete the POST
  });

  return { uploadUrl: url, fields, s3Key, publicUrl };
}

// The bucket has Block Public Access on (real per-object privacy, not just
// unguessable keys) — every read, whether a medical receipt or an
// announcement image, goes through a short-lived signed GET minted here.
export async function presignGet(s3Key: string, expiresInSeconds = 900): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: s3Key }), {
    expiresIn: expiresInSeconds,
  });
}
