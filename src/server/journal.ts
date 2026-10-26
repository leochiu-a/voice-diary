import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth";
import { currentDate } from "@/lib/format";
import { filterEntries, PAGE_SIZE } from "@/lib/journal-filter";
import { getJournalIndex } from "@/lib/journal-index";
import { requestTimings } from "@/lib/supabase/server";

// Every entry once, without its body (the index the sidebar, calendar and list
// share), so the list filters and counts in the browser by its URL (tag, voice
// notes, the calendar's day) with no request. `today` is the server's date
// ("2026-10-24"), used until the browser's is known, so what depends on it is
// part of the first paint.
export const getJournal = createServerFn({ method: "GET" }).handler(async () => {
  const { email } = await requireUser();
  return { email, entries: await getJournalIndex(), today: currentDate() };
});

// The bodies the list shows first: its first page and today's On This Day
// cards. The list fetches the rest a page at a time.
export const getFirstBodies = createServerFn({ method: "GET" }).handler(async () => {
  const timings = requestTimings();
  const { supabase } = await timings.measure("user", requireUser);
  const index = getJournalIndex();
  const [firstPage, onThisDay] = await timings.measure("data", () =>
    Promise.all([
      // Same order as the index, so these are its first page.
      supabase
        .from("entries")
        .select("id, body")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id")
        .range(0, PAGE_SIZE - 1)
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      index.then(async (all) => {
        const ids = filterEntries(all, { voice: false, onThisDay: true }, currentDate()).map(
          (entry) => entry.id,
        );
        if (ids.length === 0) return [];
        const { data, error } = await supabase.from("entries").select("id, body").in("id", ids);
        if (error) throw error;
        return data;
      }),
    ]),
  );
  // The page's headers went out before its data, so the split goes to the logs.
  console.info(`[timing] / ${timings}`);
  return [...firstPage, ...onThisDay];
});
