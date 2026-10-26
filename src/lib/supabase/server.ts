import "@tanstack/react-start/server-only";
import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie, setResponseHeader } from "@tanstack/react-start/server";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";
import { perRequest } from "@/lib/request-cache";
import { createTimings } from "@/lib/server-timing";

// One recorder per request, shared by every Supabase call the request makes,
// so a page can log all of them together.
export const requestTimings = perRequest(createTimings);

// One client per request. The session middleware refreshes the session with
// it before anything else runs, and everything after reads the refreshed
// cookies from here, since the request's own Cookie header still has the old ones.
export const getSupabase = perRequest(() => {
  const cookies = new Map(Object.entries(getCookies()));
  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    global: { fetch: requestTimings().fetch },
    cookies: {
      getAll() {
        return [...cookies].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          if (value) cookies.set(name, value);
          else cookies.delete(name);
          setCookie(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) setResponseHeader(key, value);
      },
    },
  });
});
