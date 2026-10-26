import "@tanstack/react-start/server-only";
import { AwsClient } from "aws4fetch";
import { env } from "@/lib/env";

// R2 through its S3 API, signed with aws4fetch, which only needs fetch and
// Web Crypto and so runs in a Worker.
let client: AwsClient | undefined;

function r2() {
  client ??= new AwsClient({
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
    service: "s3",
    region: "auto",
  });
  return client;
}

function objectUrl(key: string) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return new URL(`https://${env.r2AccountId}.r2.cloudflarestorage.com/${env.r2Bucket}/${path}`);
}

const UPLOAD_URL_TTL = 60 * 5;
const PLAYBACK_URL_TTL = 60 * 60;

async function presign(key: string, init: RequestInit, ttl: number) {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(ttl));
  const signed = await r2().sign(new Request(url, init), { aws: { signQuery: true } });
  return signed.url;
}

// The browser must send the same Content-Type, which the URL is signed for.
export function presignUpload(key: string, contentType: string) {
  return presign(key, { method: "PUT", headers: { "Content-Type": contentType } }, UPLOAD_URL_TTL);
}

export function presignPlayback(key: string) {
  return presign(key, { method: "GET" }, PLAYBACK_URL_TTL);
}

async function send(key: string, method: string) {
  const response = await r2().fetch(objectUrl(key), { method });
  if (!response.ok) throw new Error(`R2 ${method} ${key} failed: ${response.status}`);
  return response;
}

export async function objectSize(key: string) {
  const response = await send(key, "HEAD");
  return Number(response.headers.get("Content-Length") ?? 0);
}

export async function readObject(key: string) {
  const response = await send(key, "GET");
  return new Uint8Array(await response.arrayBuffer());
}

// One request per key: an entry has a handful of voice notes at most.
export async function deleteObjects(keys: string[]) {
  await Promise.all(keys.map((key) => send(key, "DELETE")));
}
