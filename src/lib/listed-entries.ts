import { useSyncExternalStore } from "react";
import type { EntryCardData } from "@/components/entry-card";

// An entry as the list holds it: everything but the body.
export type ListedEntry = Omit<EntryCardData, "body">;

// The browser's memory of the list: its entries by id, and the bodies fetched
// so far, a page at a time, as cards come into view. An entry opened from the
// list shows itself from here while it loads. It starts empty on every load;
// the server never writes it (it would be shared between requests).
const listed = new Map<string, ListedEntry>();
const bodies = new Map<string, string>();
const fetching = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
// Counts fresh lists, so bodies fetched for an older one are dropped.
let generation = 0;

// A fresh list from the server: its entries and the bodies it came with. Bodies
// fetched before are dropped, since an entry may have been edited since.
export function rememberListed(entries: ListedEntry[], sent: { id: string; body: string }[]) {
  listed.clear();
  for (const entry of entries) listed.set(entry.id, entry);
  bodies.clear();
  fetching.clear();
  generation++;
  addBodies(sent);
}

export function addBodies(rows: { id: string; body: string }[]) {
  for (const { id, body } of rows) bodies.set(id, body);
  version++;
  for (const listener of listeners) listener();
}

// Fetches the bodies not already here or on their way.
export function requestBodies(ids: string[]) {
  const missing = ids.filter((id) => !bodies.has(id) && !fetching.has(id));
  if (missing.length === 0) return;
  for (const id of missing) fetching.add(id);
  const asked = generation;
  fetch(`/entries/bodies?ids=${missing.join(",")}`)
    .then((response) => {
      if (!response.ok) throw new Error(`Loading entries failed: ${response.status}`);
      return response.json();
    })
    .then((rows) => {
      if (asked === generation) addBodies(rows);
    })
    .catch((error) => console.error(error))
    .finally(() => {
      if (asked === generation) for (const id of missing) fetching.delete(id);
    });
}

// The bodies fetched so far; the component re-renders as more arrive.
export function useBodies(): ReadonlyMap<string, string> {
  useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => version,
    () => version,
  );
  return bodies;
}

// An entry the list showed, if its body has arrived too.
export function listedEntry(id: string): EntryCardData | undefined {
  const entry = listed.get(id);
  const body = bodies.get(id);
  return entry && body !== undefined ? { ...entry, body } : undefined;
}
