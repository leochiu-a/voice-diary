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

function SidebarSkeleton() {
  return (
    <>
      <Skeleton className="h-28 rounded-2xl bg-sidebar-accent" />
      <Skeleton className="h-16 rounded-lg bg-sidebar-accent" />
    </>
  );
}
