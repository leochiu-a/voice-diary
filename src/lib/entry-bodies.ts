import { queryOptions } from "@tanstack/react-query";

// The route takes at most this many ids a request.
const MAX_IDS = 100;

// An entry's text, cached by id for the session: a card asks for it when it
// comes into view, and an entry opened from the list reads it while loading.
// It is cached until the editor closes on that entry, which invalidates it.
// `sent` is text the server sent with the page, which seeds the cache.
export function bodyQuery(id: string, sent?: string) {
  return queryOptions({
    queryKey: ["body", id],
    queryFn: () => fetchBody(id),
    initialData: sent,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

// Queries for a page of cards fire together, so their ids are collected for
// a tick and fetched in one request.
let pending = new Map<string, { resolve: (body: string) => void; reject: (e: unknown) => void }>();

function fetchBody(id: string) {
  return new Promise<string>((resolve, reject) => {
    if (pending.size === 0) setTimeout(flush);
    pending.set(id, { resolve, reject });
  });
}

async function flush() {
  const batch = pending;
  pending = new Map();
  const ids = [...batch.keys()];
  for (let i = 0; i < ids.length; i += MAX_IDS) {
    const chunk = ids.slice(i, i + MAX_IDS);
    try {
      const response = await fetch(`/entries/bodies?ids=${chunk.join(",")}`);
      if (!response.ok) throw new Error(`Loading entries failed: ${response.status}`);
      const rows: { id: string; body: string }[] = await response.json();
      const bodies = new Map(rows.map((row) => [row.id, row.body]));
      for (const id of chunk) {
        const body = bodies.get(id);
        if (body === undefined) batch.get(id)!.reject(new Error(`Entry ${id} not found`));
        else batch.get(id)!.resolve(body);
      }
    } catch (error) {
      for (const id of chunk) batch.get(id)!.reject(error);
    }
  }
}
