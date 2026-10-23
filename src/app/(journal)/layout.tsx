import { Suspense } from "react";
import { CalendarPanel, CalendarPanelProvider } from "@/components/calendar-panel";
import { JournalSidebar } from "@/components/journal-sidebar";
import { getJournalIndex } from "@/lib/journal-index";

// The sidebar and calendar panel live here so they stay mounted while moving
// between the list and entries; only the page between them re-renders.
export default function JournalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh w-full">
      <CalendarPanelProvider>
        <JournalSidebar />
        {children}
        <Suspense>
          <Calendar />
        </Suspense>
      </CalendarPanelProvider>
    </div>
  );
}

async function Calendar() {
  const entries = await getJournalIndex();
  return (
    <CalendarPanel
      entries={entries.map((entry) => ({
        date: entry.entry_date,
        tags: entry.tags,
        voice: entry.recordings.length > 0,
      }))}
      thisMonth={new Date().toLocaleDateString("en-CA").slice(0, 7)}
    />
  );
}
