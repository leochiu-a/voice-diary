"use client";

import { CheckIcon, ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useId, useState, useTransition } from "react";
import { saveEntry } from "@/app/(journal)/entries/actions";
import type { Entry } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { EntryDatePicker } from "./entry-date-picker";
import { TagPicker } from "./tag-picker";

// Journal-style editor: floating glass controls over a plain page. Attachments
// render above the text but outside the <form>, since they carry their own forms.
export function EntryEditor({
  entry,
  tagSuggestions,
  attachments,
  tools,
  menu,
}: {
  entry: Pick<Entry, "id" | "entry_date" | "body" | "tags">;
  tagSuggestions: string[];
  attachments: ReactNode;
  tools: ReactNode;
  menu: ReactNode;
}) {
  const formId = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [date, setDate] = useState(entry.entry_date);

  // The check button saves and returns to the journal; ⌘S saves in place.
  function save(form: HTMLFormElement, leave: boolean) {
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await saveEntry(entry.id, formData);
      setError(result.error);
      if (!result.error && leave) router.push("/");
    });
  }

  return (
    <>
      <div className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3">
        <Button
          variant="glass"
          size="icon-lg"
          nativeButton={false}
          render={<Link href="/" aria-label="Back to journal" />}
          className="justify-self-start"
        >
          <ChevronLeftIcon />
        </Button>
        <div className="glass flex items-center gap-1 rounded-full p-1">{tools}</div>
        <div className="flex items-center gap-2 justify-self-end">
          {menu}
          <Button
            type="submit"
            form={formId}
            size="icon-lg"
            disabled={pending}
            aria-label={pending ? "Saving" : "Done"}
            className="rounded-full shadow-md shadow-primary/30"
          >
            <CheckIcon />
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl pt-4">
        {attachments}
        <form
          id={formId}
          onSubmit={(event) => {
            event.preventDefault();
            save(event.currentTarget, true);
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "s") {
              event.preventDefault();
              save(event.currentTarget, false);
            }
          }}
          className="flex flex-col"
        >
          <EntryDatePicker value={date} onChange={setDate} />
          <div className="mt-2">
            <TagPicker entryId={entry.id} entryDate={date} defaultTags={entry.tags} suggestions={tagSuggestions} />
          </div>

          <textarea
            name="body"
            defaultValue={entry.body}
            placeholder="Start writing…"
            aria-label="Entry"
            className="mt-4 field-sizing-content min-h-80 w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
          />
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </>
  );
}
