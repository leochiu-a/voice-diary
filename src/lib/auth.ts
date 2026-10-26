import "@tanstack/react-start/server-only";
import { redirect } from "@tanstack/react-router";
import { isAllowedEmail } from "@/lib/allowlist";
import { env } from "@/lib/env";
import { perRequest } from "@/lib/request-cache";
import { getSupabase } from "@/lib/supabase/server";

// Verifies the session and returns the signed-in user's id with a client
// scoped to them. Every server function that touches diary data calls this.
// Accounts outside ALLOWED_EMAILS are signed out, backing up the sign-up hook.
// Cached per request, so a page whose parts each ask (the list, the sidebar,
// the index) verifies once, fetching the signing keys once on a cold start.
export const requireUser = perRequest(async () => {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw redirect({ to: "/login" });
  const email = data.claims.email as string | undefined;
  // A server route, so the browser loads it rather than the router.
  if (!isAllowedEmail(email, env.allowedEmails)) {
    throw redirect({ href: "/auth/denied", reloadDocument: true });
  }
  return { supabase, userId, email };
});
