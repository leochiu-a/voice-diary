import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";
import { createTimings } from "@/lib/server-timing";

// One recorder per request, shared by every client the request creates, so a
// page can log all of its Supabase calls together.
export const requestTimings = cache(createTimings);

export async function createClient() {
  // Supabase reads the clock while loading the session, so keep it out of prerendering.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    global: { fetch: requestTimings().fetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
