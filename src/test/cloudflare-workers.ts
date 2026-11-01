// Stands in for the Workers runtime's "cloudflare:workers" module under Vitest.
// Components import server functions, and with them src/lib/r2.ts, but no test
// reaches a binding.
export const env = {};
