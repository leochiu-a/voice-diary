import { createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { getSupabase, requestTimings } from "@/lib/supabase/server";

// The manifest, icons and launch images are fetched for the home screen app
// and the sign-in page's tab, possibly without the session cookie. Server
// functions check the user themselves (requireUser), and the sign-in page
// calls one before there is a session.
const PUBLIC_PATHS = ["/login", "/auth", "/icon", "/apple-icon", "/startup/", "/_serverFn/"];

// Refreshes the Supabase session cookie on every request, sends signed-out
// visitors to /login and signed-in ones away from it. Server functions still
// verify the user themselves; an account outside ALLOWED_EMAILS is signed out
// there, so it lands back on /login without a session.
export const sessionMiddleware = createMiddleware().server(async ({ request, next }) => {
  const timings = requestTimings();
  const { data } = await timings.measure("claims", () => getSupabase().auth.getClaims());
  const { pathname } = new URL(request.url);
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  // Sent before the page streams, so it carries the session check; the page
  // logs its own split once its data is in (see getFirstBodies).
  setResponseHeader("Server-Timing", `${timings}`);

  // Session cookies refreshed above are added to these responses too.
  if (!data?.claims && !isPublic) return redirectTo("/login");
  if (data?.claims && pathname === "/login") return redirectTo("/");
  return next();
});

function redirectTo(pathname: string) {
  return new Response(null, { status: 307, headers: { Location: pathname } });
}
