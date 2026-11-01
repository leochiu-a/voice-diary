// The bindings in wrangler.jsonc. Typed here rather than with `wrangler types`,
// whose global runtime types clash with the DOM's in this shared tsconfig.
declare module "cloudflare:workers" {
  import type { R2Bucket } from "@cloudflare/workers-types";

  export const env: { RECORDINGS: R2Bucket };
}
