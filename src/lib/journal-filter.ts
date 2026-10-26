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

// Cards the list builds at a time. The page arrives with this many entries'
// bodies; the rest are fetched as the list scrolls to them.
export const PAGE_SIZE = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The list's search params, as the router holds them: plain strings (see router.tsx).
export type FilterSearch = { tag?: string; filter?: string; day?: string; q?: string };

export function readFilter(search: Record<string, unknown>): JournalFilter {
  const value = (key: string) => {
    const param = search[key];
    return typeof param === "string" && param ? param : undefined;
  };
  const day = value("day");
  return {
    tag: value("tag"),
    voice: value("filter") === "voice",
    onThisDay: value("filter") === "on-this-day",
    day: day && ISO_DATE.test(day) ? day : undefined,
    q: value("q"),
  };
}

// The list's search params for a filter; a tag takes the place of the other filters.
export function filterSearch({ tag, voice, onThisDay, day, q }: JournalFilter): FilterSearch {
  const search: FilterSearch = {};
  if (tag) search.tag = tag;
  else if (voice) search.filter = "voice";
  else if (onThisDay) search.filter = "on-this-day";
  if (day) search.day = day;
  if (q) search.q = q;
  return search;
}

// The list's URL for a filter.
export function filterHref(filter: JournalFilter) {
  const params = new URLSearchParams(filterSearch(filter));
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
