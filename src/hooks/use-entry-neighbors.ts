import { useQuery } from "@tanstack/react-query";
import { journalQuery } from "@/lib/queries";

// The entries either side of this one in the journal's order, newest first.
// A draft not yet in the journal isn't listed and has neither.
export function useEntryNeighbors(id: string) {
  const entries = useQuery(journalQuery).data?.entries;
  const index = entries?.findIndex((entry) => entry.id === id) ?? -1;
  return {
    listed: index !== -1,
    newer: index > 0 ? entries?.[index - 1].id : undefined,
    older: index !== -1 ? entries?.[index + 1]?.id : undefined,
  };
}
