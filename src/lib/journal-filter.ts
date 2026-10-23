// What the journal list shows, as kept in its URL: "/?tag=夢", "/?filter=voice",
// with "&day=2026-10-23" when the calendar narrows it to one day.
export type JournalFilter = { tag?: string; voice: boolean; day?: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function readFilter(params: URLSearchParams): JournalFilter {
  const day = params.get("day");
  return {
    tag: params.get("tag") || undefined,
    voice: params.get("filter") === "voice",
    day: day && ISO_DATE.test(day) ? day : undefined,
  };
}

// The list's URL for a filter; a tag takes the place of the voice filter.
export function filterHref({ tag, voice, day }: JournalFilter) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  else if (voice) params.set("filter", "voice");
  if (day) params.set("day", day);
  return params.size > 0 ? `/?${params}` : "/";
}

type FilterableEntry = { entry_date: string; tags: string[]; recordings: unknown[] };

export function filterEntries<T extends FilterableEntry>(
  entries: T[],
  { tag, voice, day }: JournalFilter,
) {
  return entries.filter(
    (entry) =>
      (tag ? entry.tags.includes(tag) : !voice || entry.recordings.length > 0) &&
      (!day || entry.entry_date === day),
  );
}
