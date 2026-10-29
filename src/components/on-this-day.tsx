import { AudioLinesIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { bodyQuery } from "@/lib/entry-bodies";
import { formatEntryDate } from "@/lib/format";
import { filterEntries, filterSearch } from "@/lib/journal-filter";
import type { ListedEntry } from "@/lib/listed-entries";
import { FilterLink } from "./filter-link";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

// Today's date in earlier years, as a row of cards to swipe through, like
// Journal's and Day One's memories: each card opens its entry, and the
// heading's link lists them all. Phones swipe, with the next card peeking in;
// desktop fits three whole cards and pages through the rest with arrows, as
// the App Store does on the Mac. Shown only when there is something.
export function OnThisDay({
  entries,
  today,
  sentBodies,
}: {
  entries: ListedEntry[];
  today: string;
  sentBodies: ReadonlyMap<string, string>;
}) {
  const found = filterEntries(entries, { voice: false, onThisDay: true }, today);
  const bodies = useQueries({
    queries: found.map((entry) => bodyQuery(entry.id, sentBodies.get(entry.id))),
    combine: (results) => results.map((result) => result.data),
  });
  const row = useRef<HTMLUListElement>(null);
  const edges = useEdges(row, found.length);
  if (found.length === 0) return null;
  const page = (direction: 1 | -1) =>
    row.current?.scrollBy({ left: direction * row.current.clientWidth, behavior: "smooth" });
  const thisYear = Number(today.slice(0, 4));
  return (
    <section className="mt-7">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">On This Day</h2>
        <div className="flex items-center gap-3">
          {!(edges.atStart && edges.atEnd) && (
            <div className="flex gap-1 max-md:hidden">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous"
                disabled={edges.atStart}
                onClick={() => page(-1)}
                className="rounded-full"
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next"
                disabled={edges.atEnd}
                onClick={() => page(1)}
                className="rounded-full"
              >
                <ChevronRightIcon />
              </Button>
            </div>
          )}
          <FilterLink
            filter={{ voice: false, onThisDay: true }}
            className="flex items-center text-[15px] text-primary pointer-fine:hover:opacity-80"
          >
            See All
            <ChevronRightIcon className="size-4" aria-hidden />
          </FilterLink>
        </div>
      </div>
      {/* Phones run the row to the screen's edges, so the next card peeks in. */}
      <ul
        ref={row}
        className="-mx-5 mt-2.5 no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 md:mx-0 md:scroll-px-0 md:px-0"
      >
        {found.map((entry, i) => {
          const years = thisYear - Number(entry.entry_date.slice(0, 4));
          return (
            <li
              key={entry.id}
              className="w-[78%] max-w-72 shrink-0 snap-start md:w-[calc((100%-1.5rem)/3)] md:max-w-none"
            >
              <MemoryCard
                entry={entry}
                body={bodies[i]}
                label={years === 1 ? "1 year ago" : `${years} years ago`}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MemoryCard({
  entry,
  body,
  label,
}: {
  entry: ListedEntry;
  body: string | undefined;
  label: string;
}) {
  // Blank lines would spend the card's four lines on nothing.
  const excerpt = body?.replace(/\n\s*\n/g, "\n").trim();
  return (
    <Link
      to="/entries/$id"
      params={{ id: entry.id }}
      search={filterSearch({ voice: false, onThisDay: true })}
      className="flex h-40 flex-col gap-1.5 overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_3px_rgb(0_0_0/0.05)] transition-[scale,border-color,background-color] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none pointer-coarse:active:scale-[0.98] pointer-coarse:active:bg-muted pointer-fine:hover:border-border"
    >
      <p className="flex items-center gap-1.5 text-[13px]">
        <span className="font-semibold text-primary">{label}</span>
        <span className="text-muted-foreground">
          {formatEntryDate(entry.entry_date, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
        {entry.recordings.length > 0 && (
          <AudioLinesIcon className="ml-auto size-4 text-primary" aria-label="Has voice notes" />
        )}
      </p>
      {body === undefined ? (
        <div className="flex flex-col gap-2 pt-1">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ) : excerpt ? (
        <p className="line-clamp-4 text-[15px] leading-normal whitespace-pre-line">{excerpt}</p>
      ) : (
        <p className="text-[15px] text-muted-foreground">
          {entry.recordings.length > 0 ? "Voice note" : "Empty entry"}
        </p>
      )}
    </Link>
  );
}

// Whether the row is scrolled to its start and to its end; both when it all fits.
function useEdges(row: React.RefObject<HTMLUListElement | null>, count: number) {
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () =>
      setEdges({
        atStart: el.scrollLeft <= 1,
        atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
      });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [row, count]);
  return edges;
}

// The section while the page loads, as tall as the one it stands for.
export function OnThisDaySkeleton() {
  return (
    <section className="mt-7">
      <div className="flex h-[25.5px] items-center">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="-mx-5 mt-2.5 flex gap-3 overflow-hidden px-5 md:mx-0 md:px-0">
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            className="h-40 w-[78%] max-w-72 shrink-0 rounded-2xl md:w-[calc((100%-1.5rem)/3)] md:max-w-none"
          />
        ))}
      </div>
    </section>
  );
}
