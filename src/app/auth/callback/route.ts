import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google sends the user back here (via Supabase) with a one-time code.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect("/");
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const reason = searchParams.get("error_description") ?? "Sign-in was cancelled";
  redirect(`/login?error=${encodeURIComponent(reason)}`);
}
