import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EllipsisIcon } from "lucide-react";
import type { ReactNode } from "react";
import { bodyQuery } from "@/lib/entry-bodies";
import { listedEntry } from "@/lib/listed-entries";
import { entryQuery } from "@/lib/queries";
import { EntryEditor } from "./entry-editor";
import { Button } from "./ui/button";

// An entry as a read-only editor, from what the browser already holds: the
// entry itself when it was loaded ahead (the ones either side of an open
// entry are), else what the list knew with its card's text. Shown while an
// entry loads, and, as just its content, for the entries either side.
// Anything else (a link, a reload, a new draft) gets the fallback.
export function EntryPreview({
  id,
  fallback,
  contentOnly = false,
}: {
  id: string;
  fallback: ReactNode;
  contentOnly?: boolean;
}) {
  const loaded = useQuery({ ...entryQuery(id), enabled: false }).data;
  const listed = listedEntry(id);
  const body = useQueryClient().getQueryData(bodyQuery(id).queryKey);
  if (loaded) {
    return (
      <Preview
        entry={loaded.entry}
        recordings={loaded.recordings}
        voiceNotes={loaded.recordings.length}
        contentOnly={contentOnly}
      />
    );
  }
  if (!listed || body === undefined) return fallback;
  return (
    <Preview
      entry={{ ...listed, body }}
      recordings={[]}
      voiceNotes={listed.recordings.length}
      contentOnly={contentOnly}
    />
  );
}

function Preview({
  entry,
  recordings,
  voiceNotes,
  contentOnly,
}: Pick<Parameters<typeof EntryEditor>[0], "entry" | "recordings"> & {
  voiceNotes: number;
  contentOnly: boolean;
}) {
  const editor = (
    <EntryEditor
      entry={entry}
      tagSuggestions={[]}
      recordings={recordings}
      menu={
        <Button variant="glass" size="icon-lg" aria-label="More" className="size-12 md:size-10">
          <EllipsisIcon />
        </Button>
      }
      preview={{ voiceNotes }}
      contentOnly={contentOnly}
    />
  );
  if (contentOnly) return editor;
  return (
    <main className="relative flex h-svh min-w-0 flex-1 flex-col bg-background">{editor}</main>
  );
}
