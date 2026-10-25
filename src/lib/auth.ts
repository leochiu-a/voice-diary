import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isAllowedEmail } from "@/lib/allowlist";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Verifies the session and returns the signed-in user's id with a client
// scoped to them. Every page and action that touches diary data calls this.
// Accounts outside ALLOWED_EMAILS are signed out, backing up the sign-up hook.
// Cached per request, so a page whose parts each ask (the list, the sidebar,
// the index) verifies once, fetching the signing keys once on a cold start.
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const email = data.claims.email as string | undefined;
  if (!isAllowedEmail(email, env.allowedEmails)) redirect("/auth/denied");
  return { supabase, userId, email };
});
