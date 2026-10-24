"use client";

import { MicIcon, SearchIcon, TagIcon, XIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { formatEntryDate } from "@/lib/format";
import { filterEntries, filterHref, PAGE_SIZE, readFilter } from "@/lib/journal-filter";
import { bodyQuery } from "@/lib/entry-bodies";
import { type ListedEntry, rememberListed } from "@/lib/listed-entries";
import { journalStats } from "@/lib/stats";
import { tagCounts } from "@/lib/tags";
import { DayEmptyState } from "./day-empty-state";
import { EntryCard } from "./entry-card";
import { FilterLink } from "./filter-link";
import { InsightsCard } from "./insights-card";
import { Skeleton } from "./ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";

// A card listed with the text it shows: a search result's excerpt, or none
// yet when its body hasn't arrived.
type ListedCard = ListedEntry & { excerpt?: string };

// The journal list. It receives every entry once, without bodies, and filters
// them here by the URL's tag, voice-notes and day, so switching between them
// and the counts are instant. Bodies come a page at a time as cards come into
// view; the first page's arrive with the list. A search asks the server which
// entries match, and shows those within the filter.
export function JournalList({
  entries,
  firstBodies,
  thisYear,
}: {
  entries: ListedEntry[];
  firstBodies: { id: string; body: string }[];
  thisYear: string;
}) {
  const filter = readFilter(useSearchParams());
  const { tag, voice, day } = filter;
  const searching = Boolean(filter.q?.trim());
  const results = useSearchResults(filter.q);
  const listed: ListedCard[] = filterEntries(entries, filter).flatMap((entry) => {
    if (!searching) return [entry];
    const excerpt = results?.excerpts.get(entry.id);
    return excerpt === undefined ? [] : [{ ...entry, excerpt }];
  });
  const tags = tagCounts(entries);
  // Lets an entry opened from here show itself while it loads.
  useEffect(() => rememberListed(entries), [entries]);
  // Text the server sent with the page, which seeds the cards' queries.
  const sentBodies = useMemo(
    () => new Map(firstBodies.map(({ id, body }) => [id, body])),
    [firstBodies],
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* On phones the title shares the toolbar's row, like an iOS large title,
          and scrolls away under the pinned buttons. */}
      <h1 className="flex items-center gap-2 text-[28px] leading-tight font-bold tracking-tight max-md:-mt-12 max-md:pr-32">
        {tag && <TagIcon className="size-6 text-primary" aria-hidden />}
        {tag ?? (voice ? "Voice Notes" : "All Entries")}
      </h1>
      <p className="text-[13px] text-muted-foreground">
        {searching && !results
          ? "Searching…"
          : `${listed.length} ${listed.length === 1 ? "Entry" : "Entries"}`}
      </p>
      {day && (
        <FilterLink
          href={filterHref({ ...filter, day: undefined })}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pr-2 pl-3 text-[13px] font-medium text-primary hover:bg-primary/15"
        >
          {formatEntryDate(day, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          <XIcon className="size-3.5" aria-label="Clear day" />
        </FilterLink>
      )}

      <div className="mt-3 flex flex-col gap-3 md:hidden">
        <InsightsCard stats={journalStats(entries)} />
        {/* The sidebar's tag list, for screens without the sidebar. */}
        {tags.length > 0 && (
          <nav aria-label="Tags" className="-mx-5 no-scrollbar flex gap-2 overflow-x-auto px-5">
            {tags.map(([name]) => (
              <FilterLink
                key={name}
                href={filterHref({ tag: tag === name ? undefined : name, voice: false })}
                aria-current={tag === name ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full bg-card px-3 py-1 text-sm text-primary",
                  tag === name && "bg-primary text-primary-foreground",
                )}
              >
                <TagIcon className="size-3.5" aria-hidden />
                {name}
              </FilterLink>
            ))}
          </nav>
        )}
      </div>

      {searching && results && listed.length === 0 && (
        <Empty className="mt-8 rounded-2xl bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>No results</EmptyTitle>
            <EmptyDescription>Nothing here mentions “{results.q}”.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!searching && day && listed.length === 0 && <DayEmptyState day={day} />}

      {!searching && !day && listed.length === 0 && (
        <Empty className="mt-8 rounded-2xl bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MicIcon />
            </EmptyMedia>
            <EmptyTitle>{voice ? "No voice notes yet" : "Start with today"}</EmptyTitle>
            <EmptyDescription>
              Write it down or just talk. Voice notes are transcribed for you.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* A new filter starts the list over from its first page. */}
      <EntryPages
        key={filterHref({ ...filter, q: results?.q })}
        entries={listed}
        sentBodies={sentBodies}
        thisYear={thisYear}
        highlight={searching ? results?.q : undefined}
      />
    </div>
  );
}

// The Insights card and tag row, which only phones show, while the page loads.
export function PhoneOverviewSkeleton() {
  return (
    <div className="mt-3 flex flex-col gap-3 md:hidden">
      <Skeleton className="h-[124px] rounded-2xl" />
      <div className="-mx-5 flex gap-2 overflow-hidden px-5">
        {[20, 14, 24, 16].map((width, i) => (
          <Skeleton
            key={i}
            className="h-7 shrink-0 rounded-full"
            style={{ width: `${width * 4}px` }}
          />
        ))}
      </div>
    </div>
  );
}

// The ids of the entries matching q, each with the excerpt that shows the
// match. Asked a moment after typing stops; until the answer arrives, the
// previous query's results stay up.
function useSearchResults(q: string | undefined) {
  const query = useDebounced(q?.trim() ?? "", 200);
  const { data } = useQuery({
    queryKey: ["search", query],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/search?q=${encodeURIComponent(query)}`, { signal });
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      const matches: { id: string; excerpt: string }[] = await response.json();
      return { q: query, excerpts: new Map(matches.map((m) => [m.id, m.excerpt])) };
    },
    enabled: query !== "",
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  return q?.trim() ? data : undefined;
}

// The value once it has stayed the same for `ms`.
function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

// The cards, grouped by month, a page at a time: switching filters then
// builds one page of cards rather than every entry at once, and fetches only
// the bodies of the cards it shows. A card waiting for its body is a placeholder.
function EntryPages({
  entries,
  sentBodies,
  thisYear,
  highlight,
}: {
  entries: ListedCard[];
  sentBodies: ReadonlyMap<string, string>;
  thisYear: string;
  highlight?: string;
}) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const endRef = useRef<HTMLDivElement>(null);
  const more = shown < entries.length;
  const page = entries.slice(0, shown);
  // One query per card, so text is cached per entry across filters; a page's
  // queries fetch together (see entry-bodies). A search result shows its excerpt.
  const bodies = useQueries({
    queries: page.map((entry) => ({
      ...bodyQuery(entry.id, sentBodies.get(entry.id)),
      enabled: entry.excerpt === undefined,
    })),
    combine: (results) => results.map((result) => result.data),
  });
  const bodyOf = new Map(page.map((entry, i) => [entry.id, bodies[i]]));

  // Watched again after each page, so a page too short to fill the screen
  // still brings the next one.
  useEffect(() => {
    const end = endRef.current;
    if (!end || !more) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShown((count) => count + PAGE_SIZE);
      },
      { rootMargin: "0px 0px 1200px 0px" },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [shown, more]);

  // Group by "YYYY-MM" so each month gets its own heading.
  const months = Map.groupBy(page, (entry) => entry.entry_date.slice(0, 7));
  return (
    <>
      {[...months].map(([month, monthEntries]) => (
        <section key={month} className="mt-7">
          <h2 className="text-[17px] font-semibold">
            {formatEntryDate(monthEntries[0].entry_date, { month: "long" })}
            {!month.startsWith(thisYear) && ` ${month.slice(0, 4)}`}
          </h2>
          <ul className="mt-2.5 flex flex-col gap-4">
            {monthEntries.map((entry) => {
              const body = entry.excerpt ?? bodyOf.get(entry.id);
              return (
                <li key={entry.id}>
                  {body === undefined ? (
                    <Skeleton className="h-[196.5px] rounded-xl" />
                  ) : (
                    <EntryCard entry={{ ...entry, body }} highlight={highlight} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {more && <div ref={endRef} aria-hidden />}
    </>
  );
}
