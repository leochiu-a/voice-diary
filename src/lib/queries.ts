import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { getEntry } from "@/server/entries";
import { getFirstBodies, getJournal } from "@/server/journal";

// What the pages show, from the server. Routes start these in their loaders
// and the components read them with useSuspenseQuery, so a page streams its
// skeleton first and fills in as each arrives. Changes refetch them (see
// useRefresh); otherwise they are reused for a minute, which also keeps the
// browser from asking again for what the server just rendered.
const PAGE_STALE_TIME = 60_000;

export const journalQuery = queryOptions({
  queryKey: ["page", "journal"],
  queryFn: () => getJournal(),
  staleTime: PAGE_STALE_TIME,
});

export const firstBodiesQuery = queryOptions({
  queryKey: ["page", "first-bodies"],
  queryFn: () => getFirstBodies(),
  staleTime: PAGE_STALE_TIME,
});

export function entryQuery(id: string, date?: string) {
  return queryOptions({
    queryKey: ["page", "entry", id, date],
    queryFn: () => getEntry({ data: { id, date } }),
    staleTime: PAGE_STALE_TIME,
  });
}

// Called after a change to an entry: the sidebar, calendar, list and editor
// fetch what they show again, keeping the current data up meanwhile.
export function useRefresh() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["page"] });
}
