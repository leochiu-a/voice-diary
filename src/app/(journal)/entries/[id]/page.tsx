import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EntryMenu } from "@/components/entry-menu";
import { EntryEditor } from "@/components/entry-editor";
import { EntryPreview } from "@/components/entry-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { currentDate } from "@/lib/format";
import { presignPlayback } from "@/lib/r2";
import { deleteEntry } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function EntryPage({ params, searchParams }: PageProps<"/entries/[id]">) {
  return (
    <Suspense fallback={<EntryLoading />}>
      <Entry params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Entry({ params, searchParams }: PageProps<"/entries/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireUser();
  const { data: row } = await supabase
    .from("entries")
    .select("*, recordings(*)")
    .eq("id", id)
    .order("created_at", { referencedTable: "recordings" })
    .maybeSingle();

  // No row yet means a draft opened by "New entry"; its first save or voice note creates it.
  const { date } = await searchParams;
  const entry = row ?? {
    id,
    entry_date: typeof date === "string" && ISO_DATE.test(date) ? date : currentDate(),
    body: "",
    tags: [],
    recordings: [],
  };

  // Every tag the user has used, for the editor's suggestions.
  const { data: tagRows } = await supabase.from("entries").select("tags");
  const tagSuggestions = [...new Set((tagRows ?? []).flatMap((r) => r.tags))].sort((a, b) =>
    a.localeCompare(b),
  );

  const recordings = await Promise.all(
    entry.recordings.map(async (recording) => ({
      recording,
      src: await presignPlayback(recording.object_key),
    })),
  );

  return (
    <>
      <main className="flex min-h-svh min-w-0 flex-1 flex-col bg-card px-5 md:px-8">
        <EntryEditor
          entry={entry}
          tagSuggestions={tagSuggestions}
          menu={<EntryMenu deleteAction={deleteEntry.bind(null, entry.id)} />}
          recordings={recordings}
        />
      </main>
    </>
  );
}

// Opened from the list, the entry shows what its card knew while it loads;
// otherwise a skeleton. The preview reads the id from the URL, which the
// prerendered shell doesn't know, so the shell carries the skeleton.
function EntryLoading() {
  return (
    <Suspense fallback={<EntrySkeleton />}>
      <EntryPreview fallback={<EntrySkeleton />} />
    </Suspense>
  );
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
