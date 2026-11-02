import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { env } from "@/lib/env";
import { getSupabase } from "@/lib/supabase/server";

// Production signs in with Google only. Local development signs in with an
// emailed link, and with Google too once it's turned on in
// supabase/config.toml, which local Supabase reports in its auth settings.
export const getSignInMethods = createServerFn().handler(async () => {
  if (!import.meta.env.DEV) return { email: false, google: true };
  const response = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: env.supabasePublishableKey },
  });
  const settings: { external: { google: boolean } } = await response.json();
  return { email: true, google: settings.external.google };
});

// Sends the browser to Google; it comes back to /auth/callback. Google always
// shows its account chooser, so someone turned away as not allowed can pick a
// different account instead of being signed straight back in as the same one.
export const signInWithGoogle = createServerFn({ method: "POST" }).handler(async () => {
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getRequestHeader("origin")}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
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
