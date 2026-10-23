"use client";

import { CheckIcon, ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useId, useRef, useState, useTransition } from "react";
import { saveEntry } from "@/app/(journal)/entries/actions";
import type { Entry } from "@/lib/database.types";
import { appendParagraph } from "@/lib/entry-body";
import { Button } from "@/components/ui/button";
import { EntryDatePicker } from "./entry-date-picker";
import { TagPicker } from "./tag-picker";
import { TranscriptionContext } from "./transcription-context";
import { VoiceRecorder } from "./voice-recorder";

// Journal-style editor: floating glass controls over a plain page. Attachments
// render above the text but outside the <form>, since they carry their own forms.
// Recording a voice note adds what was said to the end of the body.
export function EntryEditor({
  entry,
  tagSuggestions,
  attachments,
  menu,
}: {
  entry: Pick<Entry, "id" | "entry_date" | "body" | "tags">;
  tagSuggestions: string[];
  attachments: ReactNode;
  menu: ReactNode;
}) {
  const formId = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [date, setDate] = useState(entry.entry_date);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [transcribing, setTranscribing] = useState<ReadonlySet<string>>(new Set());

  async function transcribe(recordingId: string, work: () => Promise<string | null>) {
    setTranscribing((ids) => new Set(ids).add(recordingId));
    try {
      const text = await work();
      const body = bodyRef.current;
      if (text && body) body.value = appendParagraph(body.value, text);
    } finally {
      setTranscribing((ids) => {
        const next = new Set(ids);
        next.delete(recordingId);
        return next;
      });
    }
  }

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
    <TranscriptionContext value={{ transcribing, transcribe }}>
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
        <div className="flex items-center gap-1 rounded-full glass p-1">
          <VoiceRecorder entryId={entry.id} entryDate={date} />
        </div>
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
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the form listens for ⌘S to save */}
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
            <TagPicker
              entryId={entry.id}
              entryDate={date}
              defaultTags={entry.tags}
              suggestions={tagSuggestions}
            />
          </div>

          <textarea
            ref={bodyRef}
            name="body"
            defaultValue={entry.body}
            placeholder="Start writing…"
            aria-label="Entry"
            className="mt-4 field-sizing-content min-h-80 w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
          />
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </TranscriptionContext>
  );
}
