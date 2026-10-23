import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Verifies the session and returns the signed-in user's id with a client
// scoped to them. Every page and action that touches diary data calls this.
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId, email: data.claims.email as string | undefined };
}
