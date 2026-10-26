import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";

// Runs `create` once per request and hands every later caller in that request
// the same value: the session middleware, the page's loaders and their server
// functions then share one Supabase client, one session check and one journal
// index.
export function perRequest<T>(create: () => T): () => T {
  const values = new WeakMap<Request, T>();
  return () => {
    const request = getRequest();
    if (!values.has(request)) values.set(request, create());
    return values.get(request)!;
  };
}
