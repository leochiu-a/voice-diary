import { useQuery } from "@tanstack/react-query";
import { useJournalFilter } from "@/hooks/use-journal-filter";
import { useToday } from "@/hooks/use-today";
import { filterEntries } from "@/lib/journal-filter";
import { journalQuery, searchQuery } from "@/lib/queries";

// The entries either side of this one in the list it was opened from, newest
// first, and where it stands in that list. The list is the journal narrowed by
// the URL's filter, as the list page narrows it (see JournalList); a search's
// list waits for its results. An entry not in the list, such as a draft, has
// no neighbors and no place.
export function useEntryNeighbors(id: string) {
  const filter = useJournalFilter();
  const today = useToday();
  const q = filter.q?.trim() ?? "";
  const entries = useQuery(journalQuery).data?.entries ?? [];
  const results = useQuery(searchQuery(q)).data;
  const list = filterEntries(entries, filter, today).filter(
    (entry) => !q || results?.excerpts.has(entry.id),
  );
  const index = list.findIndex((entry) => entry.id === id);
  return {
    newer: index > 0 ? list[index - 1].id : undefined,
    older: index !== -1 ? list[index + 1]?.id : undefined,
    position: index !== -1 ? { number: index + 1, count: list.length } : undefined,
  };
}
