import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// The app's R2 helpers (src/lib/r2.ts) are server-only, so scripts get their
// own client, configured from the same environment variables.
export function r2Bucket() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    console.error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.");
    process.exit(1);
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  return {
    put: (key: string, body: Uint8Array, contentType: string) =>
      client.send(
        new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }),
      ),
    delete: async (keys: string[]) => {
      if (keys.length === 0) return;
      await client.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    },
  };
}
