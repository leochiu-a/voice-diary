import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Opens a session for the account without emailing it anything, creating the
// account first if it has none: the admin API makes a one-time sign-in token,
// redeemed on `supabase`. Entries are then written as that user, through the
// same row-level security as the app.
export async function signIn(
  admin: SupabaseClient<Database>,
  supabase: SupabaseClient<Database>,
  email: string,
) {
  if (!(await accountExists(admin, email))) {
    // The sign-up hook still applies: the email must be in allowed_emails.
    const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    console.log(`Created an account for ${email}.`);
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
