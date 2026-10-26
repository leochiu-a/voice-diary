import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { EntryEditor } from "@/components/entry-editor";
import { EntryMenu } from "@/components/entry-menu";
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
  return (
    <Suspense fallback={<EntryLoading />}>
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
    <main className="flex min-h-svh min-w-0 flex-1 flex-col bg-card px-5 md:px-8">
      <EntryEditor
        // Another entry starts over rather than keeping this one's edits.
        key={entry.id}
        entry={entry}
        tagSuggestions={tagSuggestions}
        menu={<EntryMenu deleteAction={remove} />}
        recordings={recordings}
      />
    </main>
  );
}

// Opened from the list, the entry shows what its card knew while it loads;
// otherwise a skeleton.
function EntryLoading() {
  return <EntryPreview fallback={<EntrySkeleton />} />;
}

// Shaped like the editor: its toolbar's buttons at their sizes and places,
// and on phones the Record button at the foot.
function EntrySkeleton() {
  return (
    <main className="flex min-h-svh flex-1 flex-col bg-card px-5 md:px-8">
      <div className="relative flex items-center justify-between py-3">
        <Skeleton className="size-12 rounded-full md:size-10" />
        <Skeleton className="absolute left-1/2 hidden h-9 w-23 -translate-x-1/2 rounded-full md:block" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-12 rounded-full md:size-9" />
          <Skeleton className="size-12 rounded-full md:size-10" />
        </div>
      </div>
      <div className="mx-auto mt-4 flex w-full max-w-2xl flex-1 flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-40" />
      </div>
      <div className="sticky bottom-0 flex justify-center pt-3 pb-[max(env(safe-area-inset-bottom),1.5rem)] md:hidden">
        <Skeleton className="h-12 w-28 rounded-full" />
      </div>
    </main>
  );
}
