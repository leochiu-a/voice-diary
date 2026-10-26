import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CalendarPanel, CalendarPanelProvider } from "@/components/calendar-panel";
import { JournalSidebar } from "@/components/journal-sidebar";
import { journalQuery } from "@/lib/queries";

// The sidebar and calendar panel live here so they stay mounted while moving
// between the list and entries; only the page between them re-renders.
export const Route = createFileRoute("/_journal")({
  loader: ({ context }) => void context.queryClient.prefetchQuery(journalQuery),
  component: JournalLayout,
});

function JournalLayout() {
  return (
    <div className="flex min-h-svh w-full">
      <CalendarPanelProvider>
        <JournalSidebar />
        <Outlet />
        <CalendarPanel />
      </CalendarPanelProvider>
    </div>
  );
}
