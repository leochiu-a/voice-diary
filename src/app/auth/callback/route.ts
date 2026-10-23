import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/allowlist";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Google sends the user back here (via Supabase) with a one-time code.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
    if (!isAllowedEmail(data.user.email, env.allowedEmails)) redirect("/auth/denied");
    redirect("/");
  }

  const reason = searchParams.get("error_description") ?? "Sign-in was cancelled";
  redirect(`/login?error=${encodeURIComponent(reason)}`);
}
