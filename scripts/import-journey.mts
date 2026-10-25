// Imports a Journey export (journey.cloud) into the diary: each entry's text,
// date and tags. Photos, voice notes, places, weather and moods are left out.
//
//   pnpm import:journey <export.json | folder of .json files> --email you@gmail.com [--apply]
//
// Without --apply it only reports what it would import. Writing needs the
// Supabase project's URL and secret key in SUPABASE_URL and SUPABASE_SECRET_KEY.
// The key only opens a session for that account; entries are then written as
// that user, through the same row-level security as the app.
// Each Journey entry always maps to the same diary entry, so running it again
// skips the entries already imported.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { type JourneyEntry, toEntry } from "./journey";
import { signIn } from "./session";

const BATCH = 200;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { email: { type: "string" }, apply: { type: "boolean", default: false } },
});
const [source] = positionals;
if (!source || !values.email) {
  console.error(
    "Usage: pnpm import:journey <export.json | folder> --email you@gmail.com [--apply]",
  );
  process.exit(1);
}

const journey = await readExport(source);
const entries = journey.map(toEntry);
summarize(entries);

if (!values.apply) {
  console.log("\nDry run: nothing was written. Add --apply to import.");
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY to import.");
  process.exit(1);
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(url, secretKey, options);
const supabase = createClient<Database>(url, secretKey, options);
await signIn(admin, supabase, values.email);

const existing = await existingIds(entries.map((entry) => entry.id));
const fresh = entries.filter((entry) => !existing.has(entry.id));
for (let i = 0; i < fresh.length; i += BATCH) {
  const { error } = await supabase.from("entries").insert(fresh.slice(i, i + BATCH));
  if (error) throw error;
}
console.log(
  `\nImported ${fresh.length} entries into ${url} for ${values.email}; ${existing.size} were already there.`,
);

// A merged array of entries, or a folder of Journey's one-entry .json files.
async function readExport(path: string): Promise<JourneyEntry[]> {
  if ((await stat(path)).isDirectory()) {
    const files = (await readdir(path)).filter((file) => file.endsWith(".json"));
    return Promise.all(
      files.map(async (file) => JSON.parse(await readFile(join(path, file), "utf8"))),
    );
  }
  return JSON.parse(await readFile(path, "utf8"));
}

function summarize(list: ReturnType<typeof toEntry>[]) {
  const dates = list.map((entry) => entry.entry_date).sort();
  const tags = new Map<string, number>();
  for (const tag of list.flatMap((entry) => entry.tags)) tags.set(tag, (tags.get(tag) ?? 0) + 1);
  console.log(`${list.length} entries, ${dates[0]} to ${dates.at(-1)}`);
  console.log(`Empty after conversion: ${list.filter((entry) => !entry.body).length}`);
  console.log(
    `Tags: ${[...tags].map(([name, count]) => `${name} (${count})`).join(", ") || "none"}`,
  );
}

async function existingIds(ids: string[]) {
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += BATCH) {
    const { data, error } = await supabase
      .from("entries")
      .select("id")
      .in("id", ids.slice(i, i + BATCH));
    if (error) throw error;
    for (const { id } of data) found.add(id);
  }
  return found;
}
