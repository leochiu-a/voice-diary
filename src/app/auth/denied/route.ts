import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Signed in with an email that isn't allowed: end that session here, since only
// a route handler can clear the auth cookies, then explain on the login page.
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/login?error=${encodeURIComponent("This diary is private.")}`);
}
