// Replaces one account's diary with invented entries (scripts/fake-entries.ts),
// for local development, demos and screenshots.
//
//   pnpm seed --email you@gmail.com [--apply]
//
// Without --apply it only reports what it would write. With --apply it deletes
// every entry of that account first, recordings included, so it only runs
// against Supabase in Docker. Needs SUPABASE_URL and SUPABASE_SECRET_KEY (the
// secret key from `supabase status`).
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { fakeEntries } from "./fake-entries";
import { signIn } from "./session";

const BATCH = 200;

const { values } = parseArgs({
  options: { email: { type: "string" }, apply: { type: "boolean", default: false } },
});
if (!values.email) {
  console.error("Usage: pnpm seed --email you@gmail.com [--apply]");
  process.exit(1);
}

const entries = fakeEntries(new Date());
console.log(
  `${entries.length} fake entries, ${entries[0].entry_date} to ${entries.at(-1)!.entry_date}`,
);

if (!values.apply) {
  console.log("\nDry run: nothing was written. Add --apply to replace the account's entries.");
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY to seed.");
  process.exit(1);
}
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  console.error(`Refusing to seed ${url}: seeding deletes entries, so it only runs locally.`);
  process.exit(1);
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(url, secretKey, options);
const supabase = createClient<Database>(url, secretKey, options);
await signIn(admin, supabase, values.email);

// Row-level security limits the delete to this account's own entries.
const { count, error } = await supabase
  .from("entries")
  .delete({ count: "exact" })
  .not("id", "is", null);
if (error) throw error;
for (let i = 0; i < entries.length; i += BATCH) {
  const { error } = await supabase.from("entries").insert(entries.slice(i, i + BATCH));
  if (error) throw error;
}
console.log(
  `\nReplaced ${count ?? 0} entries with ${entries.length} fake ones in ${url} for ${values.email}.`,
);
