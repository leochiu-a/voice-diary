import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";

// A light listing of every entry (date, tags, voice note lengths) for the
// layout's sidebar and calendar. Cached per request so both share one query.
export const getJournalIndex = cache(async () => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("entries")
    .select("entry_date, tags, recordings(duration_ms)")
    .order("entry_date", { ascending: false });
  if (error) throw error;
  return data;
});
