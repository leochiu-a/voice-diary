"use client";

import { useQueryClient } from "@tanstack/react-query";
import { EllipsisIcon } from "lucide-react";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { bodyQuery } from "@/lib/entry-bodies";
import { listedEntry } from "@/lib/listed-entries";
import { EntryEditor } from "./entry-editor";
import { Button } from "./ui/button";

// Shown while an entry loads. Opened from the list, with its text already
// fetched for its card, it is the editor as a read-only preview; anything
// else (a link, a reload, a new draft) gets the fallback.
export function EntryPreview({ fallback }: { fallback: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const entry = listedEntry(id);
  const body = useQueryClient().getQueryData(bodyQuery(id).queryKey);
  if (!entry || body === undefined) return fallback;
  return (
    <main className="flex min-h-svh min-w-0 flex-1 flex-col bg-card px-5 md:px-8">
      <EntryEditor
        entry={{ ...entry, body }}
        tagSuggestions={[]}
        recordings={[]}
        menu={
          <Button variant="glass" size="icon-lg" aria-label="More" className="size-12 md:size-9">
            <EllipsisIcon />
          </Button>
        }
        preview={{ voiceNotes: entry.recordings.length }}
      />
    </main>
  );
}
