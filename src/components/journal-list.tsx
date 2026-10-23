"use client";

import { MicIcon, TagIcon, XIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { formatEntryDate } from "@/lib/format";
import { filterEntries, filterHref, readFilter } from "@/lib/journal-filter";
import { journalStats } from "@/lib/stats";
import { tagCounts } from "@/lib/tags";
import { DayEmptyState } from "./day-empty-state";
import { EntryCard, type EntryCardData } from "./entry-card";
import { FilterLink } from "./filter-link";
import { InsightsCard } from "./insights-card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";

// Cards rendered at first, and added each time the end of the list nears.
const PAGE_SIZE = 30;

// The journal list. It receives every entry once and filters them here by the
// URL's tag, voice-notes and day, so switching between them is instant.
export function JournalList({ entries, thisYear }: { entries: EntryCardData[]; thisYear: string }) {
  const filter = readFilter(useSearchParams());
  const { tag, voice, day } = filter;
  const listed = filterEntries(entries, filter);
  const tags = tagCounts(entries);

  return (
    <div className="mx-auto max-w-3xl">
      {/* On phones the title shares the toolbar's row, like an iOS large title,
          and scrolls away under the pinned buttons. */}
      <h1 className="flex items-center gap-2 text-[28px] leading-tight font-bold tracking-tight max-md:-mt-12 max-md:pr-24">
        {tag && <TagIcon className="size-6 text-primary" aria-hidden />}
        {tag ?? (voice ? "Voice Notes" : "All Entries")}
      </h1>
      <p className="text-[13px] text-muted-foreground">
        {listed.length} {listed.length === 1 ? "Entry" : "Entries"}
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

      <div className="mt-5 flex flex-col gap-3 md:hidden">
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

      {day && listed.length === 0 && <DayEmptyState day={day} />}

      {!day && listed.length === 0 && (
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
      <EntryPages key={filterHref(filter)} entries={listed} thisYear={thisYear} />
    </div>
  );
}

// The cards, grouped by month, a page at a time: switching filters then
// builds one page of cards rather than every entry at once.
function EntryPages({ entries, thisYear }: { entries: EntryCardData[]; thisYear: string }) {
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
                <EntryCard entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {more && <div ref={endRef} aria-hidden />}
    </>
  );
}
