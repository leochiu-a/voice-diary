import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { EntryEditor } from "@/components/entry-editor";
import { EntryMenu } from "@/components/entry-menu";
import { EntryPager } from "@/components/entry-pager";
import { EntryPreview } from "@/components/entry-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { entryQuery, useRefresh } from "@/lib/queries";
import { deleteEntry } from "@/server/entries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ?date= is the day a new draft is for (see NewEntryButton).
export const Route = createFileRoute("/_journal/entries/$id")({
  validateSearch: (search): { date?: string } =>
    typeof search.date === "string" && ISO_DATE.test(search.date) ? { date: search.date } : {},
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: ({ context, params, deps }) => {
    if (!UUID.test(params.id)) throw notFound();
    void context.queryClient.prefetchQuery(entryQuery(params.id, deps.date));
  },
  component: EntryPage,
});

function EntryPage() {
  const { id } = Route.useParams();
  return (
    <Suspense fallback={<EntryLoading id={id} />}>
      <Entry />
    </Suspense>
  );
}

function Entry() {
  const { id } = Route.useParams();
  const { date } = Route.useSearch();
  const { entry, tagSuggestions, recordings } = useSuspenseQuery(entryQuery(id, date)).data;
  const refresh = useRefresh();
  const navigate = useNavigate();

  async function remove() {
    await deleteEntry({ data: entry.id });
    refresh();
    await navigate({ to: "/" });
  }

  return (
    <main className="relative flex h-svh min-w-0 flex-1 flex-col bg-background">
      <EntryEditor
        // Another entry starts over rather than keeping this one's edits.
        key={entry.id}
        entry={entry}
        tagSuggestions={tagSuggestions}
        menu={<EntryMenu deleteAction={remove} />}
        recordings={recordings}
        startEditing={date !== undefined}
        // The entries either side are pages to swipe to, drawn the way an
        // entry shows while it loads.
        pages={(content) => (
          <EntryPager
            id={entry.id}
            neighbor={(neighbor) => (
              <EntryPreview id={neighbor} contentOnly fallback={<ContentSkeleton />} />
            )}
          >
            {content}
          </EntryPager>
        )}
      />
    </main>
  );
}

// While the entry loads it shows what the browser already holds of it (see
// EntryPreview); otherwise a skeleton.
function EntryLoading({ id }: { id: string }) {
  return <EntryPreview id={id} fallback={<EntrySkeleton />} />;
}

// Shaped like the editor: its toolbar's buttons at their sizes and places,
// and on phones the Record button at the foot.
function EntrySkeleton() {
  return (
    <main className="relative flex h-svh flex-1 flex-col bg-background">
      <div className="relative z-10 flex items-center justify-between px-5 py-3 md:px-8">
        <Skeleton className="size-12 rounded-full md:size-10" />
        <Skeleton className="absolute left-1/2 hidden h-9 w-23 -translate-x-1/2 rounded-full md:block" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-12 rounded-full md:size-9" />
          <Skeleton className="size-12 rounded-full md:size-10" />
        </div>
      </div>
      <div className="absolute inset-0">
        <ContentSkeleton />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-center pt-3 pb-[max(env(safe-area-inset-bottom),1.5rem)] md:hidden">
        <Skeleton className="h-12 w-28 rounded-full" />
      </div>
    </main>
  );
}

// The editor's content, placed as it is under the controls.
function ContentSkeleton() {
  return (
    <div className="px-5 pt-22 md:px-8 md:pt-20">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
