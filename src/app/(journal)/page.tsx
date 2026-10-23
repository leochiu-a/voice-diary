import { type ReactNode, Suspense } from "react";
import { AccountMenu } from "@/components/account-menu";
import { CalendarPanelToggle } from "@/components/calendar-panel";
import { JournalList, PhoneOverviewSkeleton } from "@/components/journal-list";
import { NewEntryButton } from "@/components/new-entry-button";
import { SearchToggle } from "@/components/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { currentDate } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/journal-filter";
import type { createClient } from "@/lib/supabase/server";

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Journal />
    </Suspense>
  );
}

// Loads every entry once; the list filters them in the browser by its URL
// (tag, voice notes, the calendar's day), so switching costs no request. Only
// the first page waits for the page to show: the rest, most of the page's
// weight, streams in after it.
async function Journal() {
  const { supabase, email } = await requireUser();
  const rest = listEntries(supabase, PAGE_SIZE);
  const first = await listEntries(supabase, 0, PAGE_SIZE - 1);
  const thisYear = currentDate().slice(0, 4);

  return (
    <>
      <main className="relative min-w-0 flex-1 px-5 pb-28 md:px-8">
        <Toolbar account={<AccountMenu email={email} variant="toolbar" />} />
        <Suspense fallback={<JournalList entries={first} thisYear={thisYear} partial />}>
          <FullJournalList first={first} rest={rest} thisYear={thisYear} />
        </Suspense>
        <div className="fixed right-5 bottom-6 md:hidden">
          <NewEntryButton variant="floating" />
        </div>
      </main>
    </>
  );
}

async function FullJournalList({
  first,
  rest,
  thisYear,
}: {
  first: Entries;
  rest: Promise<Entries>;
  thisYear: string;
}) {
  return <JournalList entries={[...first, ...(await rest)]} thisYear={thisYear} />;
}

type Entries = Awaited<ReturnType<typeof listEntries>>;

// Entries newest first, with their whole bodies (a card clips its text with
// CSS, and an entry opened from the list shows it all while it loads), from
// one position to another (or to the end). The id breaks ties so the two parts never overlap or skip a row.
async function listEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: number,
  to = Number.MAX_SAFE_INTEGER,
) {
  const { data, error } = await supabase
    .from("entries")
    .select("id, entry_date, body, tags, recordings(id, duration_ms)")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id")
    .range(from, to);
  if (error) throw error;
  return data;
}

// Search, then one group of the calendar and new-entry buttons. The account
// menu lives at the sidebar's foot, so only phones show it here. The rest
// needs no data, so the skeleton shows it as it is; only the account menu
// waits for the user's email.
function Toolbar({ account }: { account: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex justify-end gap-2 py-3">
      <SearchToggle>
        <CalendarPanelToggle />
        <NewEntryButton variant="toolbar" className="hidden md:inline-flex" />
      </SearchToggle>
      <div className="md:hidden">{account}</div>
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
          <PhoneOverviewSkeleton />
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
