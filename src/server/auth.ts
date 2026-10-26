import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { getSupabase } from "@/lib/supabase/server";

// Sends the browser to Google; it comes back to /auth/callback.
export const signInWithGoogle = createServerFn({ method: "POST" }).handler(async () => {
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getRequestHeader("origin")}/auth/callback` },
  });
  if (error) throw redirect({ to: "/login", search: { error: error.message } });
  throw redirect({ href: data.url });
});

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  await getSupabase().auth.signOut();
  throw redirect({ to: "/login" });
});
