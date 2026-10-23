import type { EntryCardData } from "@/components/entry-card";

// The list's entries by id, kept in the browser's memory so an entry opened
// from the list can show what its card knew while the full entry loads. The
// list writes it and the entry page reads it; it starts empty on every load,
// and the server never writes it.
const listed = new Map<string, EntryCardData>();

export function rememberListed(entries: EntryCardData[]) {
  listed.clear();
  for (const entry of entries) listed.set(entry.id, entry);
}

export function listedEntry(id: string) {
  return listed.get(id);
}
