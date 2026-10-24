import type { EntryCardData } from "@/components/entry-card";

// An entry as the list holds it: everything but the text.
export type ListedEntry = Omit<EntryCardData, "body">;

// The list's entries by id, kept in the browser's memory so an entry opened
// from the list can show itself while it loads (its text comes from the query
// cache). It starts empty on every load, and the server never writes it.
const listed = new Map<string, ListedEntry>();

export function rememberListed(entries: ListedEntry[]) {
  listed.clear();
  for (const entry of entries) listed.set(entry.id, entry);
}

export function listedEntry(id: string) {
  return listed.get(id);
}
