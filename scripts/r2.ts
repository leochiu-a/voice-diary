import type { R2Bucket } from "@cloudflare/workers-types";
import { getPlatformProxy } from "wrangler";

// The bucket `pnpm dev` uses: wrangler's local stand-in for the RECORDINGS
// binding in wrangler.jsonc, kept under .wrangler/state. Scripts only ever
// write to the local one; the deployed bucket is the Worker's alone.
export async function localBucket() {
  const proxy = await getPlatformProxy<{ RECORDINGS: R2Bucket }>();
  return { bucket: proxy.env.RECORDINGS, close: proxy.dispose };
}
