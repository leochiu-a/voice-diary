import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Every page reads live data per request and nothing is revalidated on a
// timer, so prerendered shells are served from the static assets; no R2 or KV
// cache is needed.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
