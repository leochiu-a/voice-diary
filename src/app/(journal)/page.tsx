import { MicIcon, TagIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/account-menu";
import { CalendarPanelToggle } from "@/components/calendar-panel";
import { DayEmptyState } from "@/components/day-empty-state";
import { EntryCard } from "@/components/entry-card";
import { InsightsCard } from "@/components/insights-card";
import type { JournalFilter } from "@/components/journal-sidebar";
import { NewEntryButton } from "@/components/new-entry-button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { currentDate, formatEntryDate } from "@/lib/format";
import { journalStats } from "@/lib/stats";
import { tagCounts } from "@/lib/tags";
import { cn } from "cn";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Journal searchParams={searchParams} />
    </Suspense>
  );
}

async function Journal({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { filter: param, tag: tagParam, day: dayParam } = await searchParams;
  const filter: JournalFilter = param === "voice" ? "voice" : "all";
  const tag = typeof tagParam === "string" && tagParam ? tagParam : undefined;
  const day = typeof dayParam === "string" && ISO_DATE.test(dayParam) ? dayParam : undefined;
  const { supabase, email } = await requireUser();
  const { data: allEntries, error } = await supabase
    .from("entries")
    .select("id, entry_date, body, tags, recordings(id, transcript, duration_ms)")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const listed = tag
    ? allEntries.filter((e) => e.tags.includes(tag))
    : filter === "voice"
      ? allEntries.filter((e) => e.recordings.length > 0)
      : allEntries;
  // The layout's calendar panel sets ?day= to narrow the list to one day.
  const entries = day ? listed.filter((e) => e.entry_date === day) : listed;
  // Same list without the day, for the "clear day" link.
  const withoutDay = new URLSearchParams();
  if (filter === "voice") withoutDay.set("filter", "voice");
  if (tag) withoutDay.set("tag", tag);
  // Group by "YYYY-MM" so each month gets its own heading.
  const months = Map.groupBy(entries, (entry) => entry.entry_date.slice(0, 7));
  const thisYear = currentDate().slice(0, 4);

  return (
    <>
      <main className="relative min-w-0 flex-1 px-5 pb-28 md:px-8">
        <div className="sticky top-0 z-10 flex justify-end gap-2 py-3">
          <CalendarPanelToggle />
          <NewEntryButton variant="toolbar" className="hidden md:inline-flex" />
          <AccountMenu email={email} />
        </div>
        <div className="mx-auto max-w-3xl">
          <h1 className="flex items-center gap-2 text-[28px] leading-tight font-bold tracking-tight">
            {tag && <TagIcon className="size-6 text-primary" aria-hidden />}
            {tag ?? (filter === "voice" ? "Voice Notes" : "All Entries")}
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {entries.length} {entries.length === 1 ? "Entry" : "Entries"}
          </p>
          {day && (
            <Link
              href={withoutDay.size > 0 ? `/?${withoutDay}` : "/"}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pr-2 pl-3 text-[13px] font-medium text-primary hover:bg-primary/15"
            >
              {formatEntryDate(day, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              <XIcon className="size-3.5" aria-label="Clear day" />
            </Link>
          )}

          <div className="mt-5 flex flex-col gap-3 md:hidden">
            <InsightsCard stats={journalStats(allEntries)} />
            {/* The sidebar's tag list, for screens without the sidebar. */}
            {tagCounts(allEntries).length > 0 && (
              <nav aria-label="Tags" className="-mx-5 flex gap-2 overflow-x-auto px-5">
                {tagCounts(allEntries).map(([name]) => (
                  <Link
                    key={name}
                    href={tag === name ? "/" : `/?tag=${encodeURIComponent(name)}`}
                    aria-current={tag === name ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-full bg-card px-3 py-1 text-sm text-primary",
                      tag === name && "bg-primary text-primary-foreground",
                    )}
                  >
                    <TagIcon className="size-3.5" aria-hidden />
                    {name}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {day && entries.length === 0 && <DayEmptyState day={day} />}

          {!day && entries.length === 0 && (
            <Empty className="mt-8 rounded-2xl bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MicIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {filter === "voice" ? "No voice notes yet" : "Start with today"}
                </EmptyTitle>
                <EmptyDescription>
                  Write it down or just talk. Voice notes are transcribed for you.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

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
        </div>
        <div className="fixed right-5 bottom-6 md:hidden">
          <NewEntryButton variant="floating" />
        </div>
      </main>
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      <main className="min-w-0 flex-1 px-5 pt-16 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-col">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-16" />
          <div className="mt-8 flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
