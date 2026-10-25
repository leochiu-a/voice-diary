import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { filterEntries, PAGE_SIZE } from "@/lib/journal-filter";
import { createAdminClient } from "@/lib/supabase/admin";

// The home page's data, cached per user in the remote cache so opening the
// diary doesn't wait on Supabase, whose API is slow after idling. Each user's
// entries share one tag; every action that changes an entry updates it.
//
// The exported getters verify the session first and pass on only the user id
// it proved; the cached functions below are not exported, so nothing can ask
// for another user's entries. They read with the secret key (a cached
// function can't see the request's cookies to act as the user), so each query
// filters by that id itself.

// The API returns at most this many rows a request (max_rows in Supabase).
const BATCH = 1000;

export function journalTag(userId: string) {
  return `journal:${userId}`;
}

// A light listing of every entry, newest first, without bodies: what the
// sidebar, calendar and list need to count and filter. Shared by them within
// a request.
export const getJournalIndex = cache(async () => {
  const { userId } = await requireUser();
  return indexFor(userId);
});

// The bodies the home page shows at once: its first page, and today's On This
// Day cards.
export async function getFirstBodies(today: string) {
  const { userId } = await requireUser();
  return firstBodiesFor(userId, today);
}

// The id breaks ties so the order is stable, which the list relies on to
// fetch bodies a page at a time.
async function indexFor(userId: string) {
  "use cache: remote";
  cacheTag(journalTag(userId));
  // Writes outside the app (imports, the dashboard) show within the hour.
  cacheLife("hours");
  const supabase = createAdminClient();
  const entries = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await supabase
      .from("entries")
      .select("id, entry_date, tags, recordings(id, duration_ms)")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + BATCH - 1);
    if (error) throw error;
    entries.push(...data);
    if (data.length < BATCH) return entries;
  }
}

async function firstBodiesFor(userId: string, today: string) {
  "use cache: remote";
  cacheTag(journalTag(userId));
  cacheLife("hours");
  const index = await indexFor(userId);
  const ids = new Set([
    ...index.slice(0, PAGE_SIZE).map((entry) => entry.id),
    ...filterEntries(index, { voice: false, onThisDay: true }, today).map((entry) => entry.id),
  ]);
  if (ids.size === 0) return [];
  const { data, error } = await createAdminClient()
    .from("entries")
    .select("id, body")
    .eq("user_id", userId)
    .in("id", [...ids]);
  if (error) throw error;
  return data;
}
