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

function HomeSkeleton() {
  return (
    <>
      <main className="min-w-0 flex-1 px-5 md:px-8">
        <Toolbar account={<Skeleton className="size-9 rounded-full" />} />
        <div className="mx-auto flex max-w-3xl flex-col">
          <Skeleton className="h-8 w-40 max-md:-mt-12" />
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
