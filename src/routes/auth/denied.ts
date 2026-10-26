import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSupabase } from "@/lib/supabase/server";

// Signed in with an email that isn't allowed: end that session here, where the
// response can clear the auth cookies, then explain on the login page.
export const Route = createFileRoute("/auth/denied")({
  server: {
    handlers: {
      GET: async () => {
        await getSupabase().auth.signOut();
        throw redirect({ to: "/login", search: { error: "This diary is private." } });
      },
    },
  },
});
