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
      <main className="min-h-svh min-w-0 flex-1 bg-card px-5 pb-24 md:px-8">
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

function EntrySkeleton() {
  return (
    <main className="min-h-svh flex-1 bg-card px-5 pt-3 md:px-8">
      <div className="flex justify-between">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-40" />
      </div>
    </main>
  );
}
