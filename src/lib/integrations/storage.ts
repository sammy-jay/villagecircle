import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, isConfigured } from "./status";

const client = () => new S3Client({
  region: env("S3_REGION") || "auto", endpoint: env("S3_ENDPOINT") || undefined, forcePathStyle: !!env("S3_ENDPOINT"),
  credentials: { accessKeyId: env("S3_ACCESS_KEY_ID"), secretAccessKey: env("S3_SECRET_ACCESS_KEY") },
});

const SAFE = /^[a-z0-9][a-z0-9/_.-]{2,200}$/i;
export function assertKey(key: string) { if (!SAFE.test(key) || key.includes("..")) throw new Error("Invalid storage key"); }

/** Short-lived upload URL; objects are private and encrypted at rest (SSE). */
export async function presignUpload(key: string, contentType: string, maxSeconds = 300) {
  assertKey(key);
  if (!isConfigured("storage")) throw new Error("Storage is not configured yet (set the S3_* variables).");
  return getSignedUrl(client(), new PutObjectCommand({ Bucket: env("S3_BUCKET"), Key: key, ContentType: contentType, ServerSideEncryption: "AES256" }), { expiresIn: maxSeconds });
}
/** Recordings and résumés are only ever served through short-lived signed URLs, issued after a permission check. */
export async function presignDownload(key: string, maxSeconds = 120) {
  assertKey(key);
  if (!isConfigured("storage")) throw new Error("Storage is not configured yet (set the S3_* variables).");
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: env("S3_BUCKET"), Key: key }), { expiresIn: maxSeconds });
}
export async function deleteObject(key: string) {
  assertKey(key);
  if (isConfigured("storage")) await client().send(new DeleteObjectCommand({ Bucket: env("S3_BUCKET"), Key: key }));
}
