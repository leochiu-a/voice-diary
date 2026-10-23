"use client";

import { EllipsisIcon } from "lucide-react";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { listedEntry } from "@/lib/listed-entries";
import { EntryEditor } from "./entry-editor";
import { Button } from "./ui/button";

// Shown while an entry loads. Opened from the list, it is the editor as a
// read-only preview of what the list knew, text and all; anything else (a
// link, a reload, a new draft) gets the fallback.
export function EntryPreview({ fallback }: { fallback: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const entry = listedEntry(id);
  if (!entry) return fallback;
  return (
    <main className="min-h-svh min-w-0 flex-1 bg-card px-5 pb-24 md:px-8">
      <EntryEditor
        entry={entry}
        tagSuggestions={[]}
        recordings={[]}
        menu={
          <Button variant="glass" size="icon-lg" aria-label="More">
            <EllipsisIcon />
          </Button>
        }
        preview={{ voiceNotes: entry.recordings.length }}
      />
    </main>
  );
}
