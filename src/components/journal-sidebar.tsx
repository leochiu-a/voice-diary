import { AudioLinesIcon, LayoutGridIcon, TagIcon } from "lucide-react";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getJournalIndex } from "@/lib/journal-index";
import { AccountMenu } from "./account-menu";
import { journalStats } from "@/lib/stats";
import { tagCounts } from "@/lib/tags";
import { InsightsCard } from "./insights-card";
import { SidebarNav } from "./sidebar-nav";
import { Skeleton } from "./ui/skeleton";

// Mirrors the sidebar of Journal on Mac and iPad: Insights on top, then the
// journal list and tags, with the account at the foot. Rendered by the (journal) layout, so it persists
// across pages; actions that change entries call refresh() to update it.
export function JournalSidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 pt-14 text-sidebar-foreground md:flex">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent />
      </Suspense>
      <div className="mt-auto">
        <Suspense fallback={<Skeleton className="h-9 rounded-lg bg-sidebar-accent" />}>
          <SidebarAccount />
        </Suspense>
      </div>
    </aside>
  );
}

async function SidebarContent() {
  const entries = await getJournalIndex();
  const stats = journalStats(entries);
  const tags = tagCounts(entries);

  return (
    <>
      <InsightsCard stats={stats} />
      <SidebarNav
        label="Journals"
        items={[
          {
            key: "all",
            href: "/",
            label: "All Entries",
            icon: <LayoutGridIcon aria-hidden />,
            count: stats.entries,
          },
          {
            key: "voice",
            href: "/?filter=voice",
            label: "Voice Notes",
            icon: <AudioLinesIcon aria-hidden />,
            count: stats.withVoice,
          },
        ]}
      />
      {tags.length > 0 && (
        <SidebarNav
          label="Tags"
          items={tags.map(([name, count]) => ({
            key: `tag:${name}`,
            href: `/?tag=${encodeURIComponent(name)}`,
            label: name,
            icon: <TagIcon aria-hidden />,
            count,
          }))}
        />
      )}
    </>
  );
}

async function SidebarAccount() {
  const { email } = await requireUser();
  return <AccountMenu email={email} variant="sidebar" />;
}

// Shaped like the sidebar: the Insights card, then each list's heading and
// rows (icon, label, count) at their real sizes, so nothing moves on load.
function SidebarSkeleton() {
  return (
    <>
      <Skeleton className="h-31 rounded-2xl bg-sidebar-accent" />
      <NavSkeleton rows={2} />
      <NavSkeleton rows={4} />
    </>
  );
}

function NavSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex h-5 items-start px-2">
        <Skeleton className="h-3 w-14 bg-sidebar-accent" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-8 items-center gap-2.5 px-2">
          <Skeleton className="size-4 rounded bg-sidebar-accent" />
          <Skeleton className="h-3.5 w-24 bg-sidebar-accent" />
          <Skeleton className="ml-auto h-3.5 w-6 bg-sidebar-accent" />
        </div>
      ))}
    </div>
  );
}
