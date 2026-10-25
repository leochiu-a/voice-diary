import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";

// The API returns at most this many rows a request (max_rows in Supabase).
const BATCH = 1000;

// A light listing of every entry, newest first, without bodies: what the
// sidebar, calendar and list need to count and filter. Cached per request so
// they share one query. The id breaks ties so the order is stable, which the
// list relies on to fetch bodies a page at a time.
export const getJournalIndex = cache(async () => {
  const { supabase } = await requireUser();
  const entries = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await supabase
      .from("entries")
      .select("id, entry_date, tags, recordings(id, duration_ms)")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + BATCH - 1);
    if (error) throw error;
    entries.push(...data);
    if (data.length < BATCH) return entries;
  }
});
