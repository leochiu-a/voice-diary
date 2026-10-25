import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createTimings } from "@/lib/server-timing";

// The manifest, icons and launch images are fetched for the home screen app
// and the sign-in page's tab, possibly without the session cookie.
const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/startup/",
];

// Refreshes the Supabase session cookie on every request, sends signed-out
// visitors to /login and signed-in ones away from it. Pages still verify the
// user themselves; an account outside ALLOWED_EMAILS is signed out there, so
// it lands back on /login without a session.
export async function updateSession(request: NextRequest) {
  const timings = createTimings();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: timings.fetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  const { data } = await timings.measure("claims", () => supabase.auth.getClaims());
  const isPublic = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!data?.claims && !isPublic) return withTimings(redirectTo(request, "/login"), timings);
  if (data?.claims && request.nextUrl.pathname === "/login") {
    // Carry over any session cookies just refreshed above.
    const redirect = redirectTo(request, "/");
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return withTimings(redirect, timings);
  }

  return withTimings(response, timings);
}

function withTimings(response: NextResponse, timings: ReturnType<typeof createTimings>) {
  response.headers.set("Server-Timing", `${timings}`);
  return response;
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}
