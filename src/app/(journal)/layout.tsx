import { Suspense } from "react";
import {
  type CalendarData,
  CalendarPanel,
  CalendarPanelProvider,
} from "@/components/calendar-panel";
import { JournalSidebar } from "@/components/journal-sidebar";
import { currentDate } from "@/lib/format";
import { getJournalIndex } from "@/lib/journal-index";

// The sidebar and calendar panel live here so they stay mounted while moving
// between the list and entries; only the page between them re-renders.
export default function JournalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh w-full">
      <CalendarPanelProvider>
        <JournalSidebar />
        {children}
        {/* The panel reads the pathname, which an entry's shell can't know yet. */}
        <Suspense>
          <CalendarPanel data={calendarData()} />
        </Suspense>
      </CalendarPanelProvider>
    </div>
  );
}

// Streamed into the panel, which shows its frame before the months arrive.
async function calendarData(): Promise<CalendarData> {
  const entries = await getJournalIndex();
  return {
    entries: entries.map((entry) => ({
      date: entry.entry_date,
      tags: entry.tags,
      voice: entry.recordings.length > 0,
    })),
    thisMonth: currentDate().slice(0, 7),
  };
}
