// Replaces one account's diary with invented entries (scripts/fake-entries.ts),
// for local development, demos and screenshots.
//
//   pnpm seed --email you@gmail.com [--voice 2] [--apply]
//
// Without --apply it only reports what it would write. With --apply it deletes
// every entry of that account first, recordings and their audio included, so
// it only runs against Supabase in Docker. Needs SUPABASE_URL and
// SUPABASE_SECRET_KEY (the secret key from `supabase status`), plus the R2
// variables once the account has voice notes.
//
// --voice N reads the N most recent fake entries aloud with OpenAI
// text-to-speech and attaches each as a voice note, its transcript the entry's
// text. That also needs OPENAI_API_KEY; `pnpm seed` loads .env.local.
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { fakeEntries } from "./fake-entries";
import { r2Bucket } from "./r2";
import { signIn } from "./session";
import { speak } from "./speak";

const BATCH = 200;

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    voice: { type: "string", default: "0" },
    apply: { type: "boolean", default: false },
  },
});
const voiceNotes = Number(values.voice);
if (!values.email || !Number.isInteger(voiceNotes) || voiceNotes < 0) {
  console.error("Usage: pnpm seed --email you@gmail.com [--voice 2] [--apply]");
  process.exit(1);
}

const entries = fakeEntries(new Date());
console.log(
  `${entries.length} fake entries, ${entries[0].entry_date} to ${entries.at(-1)!.entry_date}`,
);
console.log(`Voice notes on the ${voiceNotes} most recent`);

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
const {
  data: { user },
} = await supabase.auth.getUser();

// Deleting the entries removes their recordings rows, so their audio goes
// first. Row-level security limits both to this account's own.
const { data: recordings, error: recordingsError } = await supabase
  .from("recordings")
  .select("object_key");
if (recordingsError) throw recordingsError;
if (recordings.length > 0) await r2Bucket().delete(recordings.map((r) => r.object_key));

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

if (voiceNotes > 0) {
  const { data: latest, error } = await supabase
    .from("entries")
    .select("id, entry_date, body, created_at")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(voiceNotes);
  if (error) throw error;
  const bucket = r2Bucket();
  for (const entry of latest) {
    const { audio, durationMs } = await speak(entry.body);
    const id = randomUUID();
    const key = `${user!.id}/${entry.id}/${id}.wav`;
    await bucket.put(key, audio, "audio/wav");
    const { error } = await supabase.from("recordings").insert({
      id,
      entry_id: entry.id,
      object_key: key,
      mime_type: "audio/wav",
      duration_ms: durationMs,
      transcript: entry.body,
      transcript_status: "done",
      created_at: entry.created_at,
    });
    if (error) {
      await bucket.delete([key]);
      throw error;
    }
    console.log(`Voice note on ${entry.entry_date}: ${(durationMs / 1000).toFixed(1)} s`);
  }
}
