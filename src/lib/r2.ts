import "@tanstack/react-start/server-only";
import { env } from "cloudflare:workers";
import type * as Workers from "@cloudflare/workers-types";

// The bucket bound in wrangler.jsonc. Audio goes in and out through this
// Worker (src/routes/audio/$.ts), so there are no R2 API tokens or CORS rules
// to set up, and `pnpm dev` runs against a local stand-in for the bucket.
//
// The Workers types describe streams and headers with their own declarations
// of the same web APIs the DOM types (which the rest of the app uses) declare,
// so values cross between the two here, and only here, with a cast.
const bucket = () => env.RECORDINGS;

// Where the browser plays a voice note from and uploads it to.
export function recordingUrl(key: string) {
  return `/audio/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function putObject(key: string, body: ReadableStream, contentType: string) {
  await bucket().put(key, body as unknown as Workers.ReadableStream, {
    httpMetadata: { contentType },
  });
}

// Answers a GET for the object, honouring the request's Range header (the
// <audio> element asks for the file in ranges) and If-None-Match.
export async function serveObject(key: string, request: Request) {
  const conditions = request.headers as unknown as Workers.Headers;
  const object = await bucket().get(key, { range: conditions, onlyIf: conditions });
  if (!object) return new Response(null, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers as unknown as Workers.Headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  // A key is never reused for other audio.
  headers.set("Cache-Control", "private, max-age=31536000, immutable");
  // No body: the browser's copy still matches.
  if (!("body" in object)) return new Response(null, { status: 304, headers });

  const body = object.body as unknown as ReadableStream;
  const range = request.headers.has("Range") ? object.range : undefined;
  if (!range) return new Response(body, { headers });
  const { offset, length } = byteRange(range, object.size);
  headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
  headers.set("Content-Length", String(length));
  return new Response(body, { status: 206, headers });
}

// R2 reports the range it served as an offset and length, or as a suffix (the
// last n bytes). Its type is a union of those forms, but the object carries
// all three keys, the unused ones undefined, so it is read as that.
function byteRange(range: Workers.R2Range, size: number) {
  const { offset, length, suffix } = range as { offset?: number; length?: number; suffix?: number };
  if (suffix !== undefined) return { offset: size - suffix, length: suffix };
  const start = offset ?? 0;
  return { offset: start, length: length ?? size - start };
}

export async function objectSize(key: string) {
  const object = await bucket().head(key);
  if (!object) throw new Error(`R2 object ${key} not found`);
  return object.size;
}

export async function readObject(key: string) {
  const object = await bucket().get(key);
  if (!object) throw new Error(`R2 object ${key} not found`);
  return new Uint8Array(await object.arrayBuffer());
}

export async function deleteObjects(keys: string[]) {
  if (keys.length > 0) await bucket().delete(keys);
}
