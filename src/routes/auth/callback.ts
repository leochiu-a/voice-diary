import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAllowedEmail } from "@/lib/allowlist";
import { env } from "@/lib/env";
import { getSupabase } from "@/lib/supabase/server";

// Google sends the user back here (via Supabase) with a one-time code.
export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");

        if (code) {
          const { data, error } = await getSupabase().auth.exchangeCodeForSession(code);
          if (error) throw redirect({ to: "/login", search: { error: error.message } });
          if (!isAllowedEmail(data.user.email, env.allowedEmails)) {
            throw redirect({ href: "/auth/denied" });
          }
          throw redirect({ to: "/" });
        }

        const reason = searchParams.get("error_description") ?? "Sign-in was cancelled";
        throw redirect({ to: "/login", search: { error: reason } });
      },
    },
  },
});
