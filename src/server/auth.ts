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

// Local development only, so it needs no Google OAuth client: Supabase in
// Docker emails a sign-in link, which Mailpit catches instead of sending, and
// the link comes back to /auth/callback like Google does. The sign-up hook
// still limits it to allowed_emails.
export const signInWithEmail = createServerFn({ method: "POST" })
  .validator((email: unknown) => {
    if (typeof email !== "string" || !email.includes("@")) throw new Error("Invalid email");
    return email.trim();
  })
  .handler(async ({ data: email }) => {
    if (!import.meta.env.DEV) throw new Error("Email sign-in is for local development");
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${getRequestHeader("origin")}/auth/callback` },
    });
    if (error) throw redirect({ to: "/login", search: { error: error.message } });
    throw redirect({ to: "/login", search: { sent: email } });
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  await getSupabase().auth.signOut();
  throw redirect({ to: "/login" });
});
