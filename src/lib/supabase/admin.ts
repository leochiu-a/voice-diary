import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

// A client with the secret key, which bypasses row-level security. Cached
// reads can't see the request's cookies, so they can't act as the user; only
// src/lib/journal-data.ts uses this, and every query there filters by the
// user id it was given.
export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
