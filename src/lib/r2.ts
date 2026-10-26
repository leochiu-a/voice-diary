import "@tanstack/react-start/server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

let client: S3Client | undefined;

function r2() {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
    // R2 rejects the SDK's default CRC32 checksums on presigned browser uploads.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

const UPLOAD_URL_TTL = 60 * 5;
const PLAYBACK_URL_TTL = 60 * 60;

export function presignUpload(key: string, contentType: string) {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: env.r2Bucket, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL },
  );
}

export function presignPlayback(key: string) {
  return getSignedUrl(r2(), new GetObjectCommand({ Bucket: env.r2Bucket, Key: key }), {
    expiresIn: PLAYBACK_URL_TTL,
  });
}

export async function objectSize(key: string) {
  const head = await r2().send(new HeadObjectCommand({ Bucket: env.r2Bucket, Key: key }));
  return head.ContentLength ?? 0;
}

export async function readObject(key: string) {
  const object = await r2().send(new GetObjectCommand({ Bucket: env.r2Bucket, Key: key }));
  if (!object.Body) throw new Error(`R2 object ${key} has no body`);
  return object.Body.transformToByteArray();
}

export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return;
  await r2().send(
    new DeleteObjectsCommand({
      Bucket: env.r2Bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }),
  );
}
