"use client";

import { MicIcon, SearchIcon, TagIcon, XIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { formatEntryDate } from "@/lib/format";
import { filterEntries, filterHref, PAGE_SIZE, readFilter } from "@/lib/journal-filter";
import { journalStats } from "@/lib/stats";
import { tagCounts } from "@/lib/tags";
import { DayEmptyState } from "./day-empty-state";
import { EntryCard, type EntryCardData } from "./entry-card";
import { FilterLink } from "./filter-link";
import { InsightsCard } from "./insights-card";
import { Skeleton } from "./ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";

// The journal list. It receives every entry once and filters them here by the
// URL's tag, voice-notes and day, so switching between them is instant. A
// search asks the server which of them match, and shows those within the filter.
// While only the first page has arrived (partial), its cards are a true start
// of the list, but totals would be wrong, so counts and the phone's Insights
// and tags wait as placeholders, and no empty state is shown.
export function JournalList({
  entries,
  thisYear,
  partial = false,
}: {
  entries: EntryCardData[];
  thisYear: string;
  partial?: boolean;
}) {
  const filter = readFilter(useSearchParams());
  const { tag, voice, day } = filter;
  const searching = Boolean(filter.q?.trim());
  const results = useSearchResults(filter.q);
  const listed = filterEntries(entries, filter).flatMap((entry) => {
    if (!searching) return [entry];
    const excerpt = results?.excerpts.get(entry.id);
    return excerpt === undefined ? [] : [{ ...entry, body: excerpt }];
  });
  const tags = tagCounts(entries);

  return (
    <div className="mx-auto max-w-3xl">
      {/* On phones the title shares the toolbar's row, like an iOS large title,
          and scrolls away under the pinned buttons. */}
      <h1 className="flex items-center gap-2 text-[28px] leading-tight font-bold tracking-tight max-md:-mt-12 max-md:pr-32">
        {tag && <TagIcon className="size-6 text-primary" aria-hidden />}
        {tag ?? (voice ? "Voice Notes" : "All Entries")}
      </h1>
      {partial ? (
        <div className="flex h-[19.5px] items-center">
          <Skeleton className="h-3.5 w-16" />
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {searching && !results
            ? "Searching…"
            : `${listed.length} ${listed.length === 1 ? "Entry" : "Entries"}`}
        </p>
      )}
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

      {partial ? (
        <PhoneOverviewSkeleton />
      ) : (
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
      )}

      {!partial && searching && results && listed.length === 0 && (
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

      {!partial && !searching && day && listed.length === 0 && <DayEmptyState day={day} />}

      {!partial && !searching && !day && listed.length === 0 && (
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
        thisYear={thisYear}
        highlight={searching ? results?.q : undefined}
      />
    </div>
  );
}

// The Insights card and tag row, which only phones show, before the totals
// behind them are known.
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
  const [results, setResults] = useState<{ q: string; excerpts: Map<string, string> }>();
  const query = q?.trim();
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Search failed: ${response.status}`);
        const matches: { id: string; excerpt: string }[] = await response.json();
        setResults({ q: query, excerpts: new Map(matches.map((m) => [m.id, m.excerpt])) });
      } catch (error) {
        if (!controller.signal.aborted) console.error(error);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return query ? results : undefined;
}

// The cards, grouped by month, a page at a time: switching filters then
// builds one page of cards rather than every entry at once.
function EntryPages({
  entries,
  thisYear,
  highlight,
}: {
  entries: EntryCardData[];
  thisYear: string;
  highlight?: string;
}) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const endRef = useRef<HTMLDivElement>(null);
  const more = shown < entries.length;

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
  const months = Map.groupBy(entries.slice(0, shown), (entry) => entry.entry_date.slice(0, 7));
  return (
    <>
      {[...months].map(([month, monthEntries]) => (
        <section key={month} className="mt-7">
          <h2 className="text-[17px] font-semibold">
            {formatEntryDate(monthEntries[0].entry_date, { month: "long" })}
            {!month.startsWith(thisYear) && ` ${month.slice(0, 4)}`}
          </h2>
          <ul className="mt-2.5 flex flex-col gap-4">
            {monthEntries.map((entry) => (
              <li key={entry.id}>
                <EntryCard entry={entry} highlight={highlight} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {more && <div ref={endRef} aria-hidden />}
    </>
  );
}
