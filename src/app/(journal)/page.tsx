import { type ReactNode, Suspense } from "react";
import { AccountMenu } from "@/components/account-menu";
import { CalendarPanelToggle } from "@/components/calendar-panel";
import { JournalList } from "@/components/journal-list";
import { NewEntryButton } from "@/components/new-entry-button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { cardExcerpt } from "@/lib/entry-body";
import { currentDate } from "@/lib/format";

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Journal />
    </Suspense>
  );
}

// Loads every entry once; the list filters them in the browser by its URL
// (tag, voice notes, the calendar's day), so switching costs no request.
async function Journal() {
  const { supabase, email } = await requireUser();
  const { data, error } = await supabase
    .from("entries")
    .select("id, entry_date, body, tags, recordings(id, duration_ms)")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const entries = data.map((entry) => ({ ...entry, body: cardExcerpt(entry.body) }));

  return (
    <>
      <main className="relative min-w-0 flex-1 px-5 pb-28 md:px-8">
        <Toolbar account={<AccountMenu email={email} />} />
        <JournalList entries={entries} thisYear={currentDate().slice(0, 4)} />
        <div className="fixed right-5 bottom-6 md:hidden">
          <NewEntryButton variant="floating" />
        </div>
      </main>
    </>
  );
}

// The calendar and new-entry buttons need no data, so the skeleton shows them
// as they are; only the account menu waits for the user's email.
function Toolbar({ account }: { account: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex justify-end gap-2 py-3">
      <CalendarPanelToggle />
      <NewEntryButton variant="toolbar" className="hidden md:inline-flex" />
      {account}
    </div>
  );
}

// Laid out like JournalList, line for line, so the list replaces it without
// anything moving: each bar sits in a box as tall as the text it stands for
// (28px title at 1.25, 13px and 17px lines at 1.5), and a card is as tall as an
// entry with the full six-line excerpt.
function HomeSkeleton() {
  return (
    <>
      <main className="relative min-w-0 flex-1 px-5 pb-28 md:px-8">
        <Toolbar account={<Skeleton className="size-9 rounded-full" />} />
        <div className="mx-auto max-w-3xl">
          <div className="flex h-[35px] items-center max-md:-mt-12">
            <Skeleton className="h-7 w-40" />
          </div>
          <div className="flex h-[19.5px] items-center">
            <Skeleton className="h-3.5 w-16" />
          </div>
          {/* The Insights card and tag row, which only phones show. */}
          <div className="mt-5 flex flex-col gap-3 md:hidden">
            <Skeleton className="h-[124px] rounded-2xl" />
            <div className="-mx-5 flex gap-2 overflow-hidden px-5">
              {[20, 14, 24, 16].map((width, i) => (
                <Skeleton key={i} className="h-7 shrink-0 rounded-full" style={{ width: `${width * 4}px` }} />
              ))}
            </div>
          </div>
          <section className="mt-7">
            <div className="flex h-[25.5px] items-center">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="mt-2.5 flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[196.5px] rounded-xl" />
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
