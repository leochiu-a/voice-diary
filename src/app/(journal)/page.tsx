import { type ReactNode, Suspense } from "react";
import { AccountMenu } from "@/components/account-menu";
import { CalendarPanelToggle } from "@/components/calendar-panel";
import { JournalList, PhoneOverviewSkeleton } from "@/components/journal-list";
import { NewEntryButton } from "@/components/new-entry-button";
import { type SearchFilters, SearchToggle } from "@/components/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { currentDate } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/journal-filter";
import { getJournalIndex } from "@/lib/journal-index";
import { journalStats } from "@/lib/stats";
import { tagCounts } from "@/lib/tags";

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Journal />
    </Suspense>
  );
}

// Loads every entry once without its body (the index the sidebar and calendar
// share), so the list filters and counts in the browser by its URL (tag, voice
// notes, the calendar's day) with no request. Bodies come with the first page
// here; the list fetches the rest a page at a time.
async function Journal() {
  const { supabase, email } = await requireUser();
  const [entries, firstBodies] = await Promise.all([
    getJournalIndex(),
    // Same order as the index, so these are its first page.
    supabase
      .from("entries")
      .select("id, body")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(0, PAGE_SIZE - 1)
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
  ]);

  return (
    <>
      <main className="relative min-w-0 flex-1 px-5 pb-28 md:px-8">
        <Toolbar
          account={<AccountMenu email={email} variant="toolbar" />}
          filters={{ voiceNotes: journalStats(entries).withVoice, tags: tagCounts(entries) }}
        />
        <JournalList entries={entries} firstBodies={firstBodies} serverToday={currentDate()} />
        <div className="fixed right-5 bottom-6 md:hidden">
          <NewEntryButton variant="floating" />
        </div>
      </main>
    </>
  );
}

// Phones use separate 48px glass controls; desktop groups calendar and new entry. The account
// menu lives at the sidebar's foot, so only phones show it here. The rest
// needs no data, so the skeleton shows it as it is; only the account menu
// waits for the user's email.
//
// On phones, only the controls have glass surfaces so entries remain visible
// between them while scrolling. Desktop keeps a full-width frosted toolbar surface.
function Toolbar({ account, filters }: { account: ReactNode; filters?: SearchFilters }) {
  return (
    <div className="relative sticky top-0 z-10 -mx-5 flex justify-end gap-2.5 journal-toolbar px-5 py-3 md:-mx-8 md:px-8">
      <SearchToggle filters={filters}>
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
        <Toolbar account={<Skeleton className="size-12 rounded-full md:size-9" />} />
        <div className="mx-auto max-w-3xl">
          <div className="flex h-[35px] items-center max-md:hidden">
            <Skeleton className="h-7 w-40" />
          </div>
          <div className="flex h-[19.5px] items-center max-md:hidden">
            <Skeleton className="h-3.5 w-16" />
          </div>
          <PhoneOverviewSkeleton />
          {/* The On This Day card, which most days have. */}
          <Skeleton className="mt-3 h-[70px] rounded-2xl" />
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
