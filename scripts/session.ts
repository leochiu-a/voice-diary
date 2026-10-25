import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Opens a session for an existing account without emailing it anything: the
// admin API makes a one-time sign-in token, redeemed on `supabase`. Entries are
// then written as that user, through the same row-level security as the app.
export async function signIn(
  admin: SupabaseClient<Database>,
  supabase: SupabaseClient<Database>,
  email: string,
) {
  if (!(await accountExists(admin, email))) {
    console.error(`No account for ${email}. Sign in to the diary once first.`);
    process.exit(1);
  }
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) throw verifyError;
}

async function accountExists(admin: SupabaseClient<Database>, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    if (data.users.some((user) => user.email?.toLowerCase() === email.toLowerCase())) return true;
    if (data.users.length < 1000) return false;
  }
}
