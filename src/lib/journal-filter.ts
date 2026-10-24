// What the journal list shows, as kept in its URL: "/?tag=夢", "/?filter=voice",
// "/?filter=on-this-day" (today's date in earlier years), with
// "&day=2026-10-23" when the calendar narrows it to one day and "&q=海" while
// searching within it.
export type JournalFilter = {
  tag?: string;
  voice: boolean;
  onThisDay?: boolean;
  day?: string;
  q?: string;
};

// Cards the list builds at a time. The page shell carries this many entries;
// the rest stream in after it.
export const PAGE_SIZE = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function readFilter(params: URLSearchParams): JournalFilter {
  const day = params.get("day");
  return {
    tag: params.get("tag") || undefined,
    voice: params.get("filter") === "voice",
    onThisDay: params.get("filter") === "on-this-day",
    day: day && ISO_DATE.test(day) ? day : undefined,
    q: params.get("q") || undefined,
  };
}

// The list's URL for a filter; a tag takes the place of the other filters.
export function filterHref({ tag, voice, onThisDay, day, q }: JournalFilter) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  else if (voice) params.set("filter", "voice");
  else if (onThisDay) params.set("filter", "on-this-day");
  if (day) params.set("day", day);
  if (q) params.set("q", q);
  return params.size > 0 ? `/?${params}` : "/";
}

type FilterableEntry = { entry_date: string; tags: string[]; recordings: unknown[] };

// today ("2026-10-24") is the browser's date, which On This Day needs; until
// it is known, that filter matches nothing.
export function filterEntries<T extends FilterableEntry>(
  entries: T[],
  { tag, voice, onThisDay, day }: JournalFilter,
  today?: string | null,
) {
  return entries.filter(
    (entry) =>
      (tag
        ? entry.tags.includes(tag)
        : voice
          ? entry.recordings.length > 0
          : !onThisDay || (today != null && isOnThisDay(entry.entry_date, today))) &&
      (!day || entry.entry_date === day),
  );
}

// The same month and day as today, in an earlier year.
function isOnThisDay(date: string, today: string) {
  return date.slice(5) === today.slice(5) && date.slice(0, 4) < today.slice(0, 4);
}
