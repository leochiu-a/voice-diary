"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { saveEntry } from "@/app/(journal)/entries/actions";
import type { Entry, Recording } from "@/lib/database.types";
import { bodyQuery } from "@/lib/entry-bodies";
import { appendParagraph } from "@/lib/entry-body";
import { type LocalVoiceNote, type TranscriptOutcome, voiceNotes } from "@/lib/voice-notes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EntryDatePicker } from "./entry-date-picker";
import { RecordingItem } from "./recording-item";
import { TagPicker } from "./tag-picker";
import { VoiceNotesContext } from "./voice-notes-context";
import { VoiceRecorder } from "./voice-recorder";

// Journal-style editor: floating glass controls over a plain page. Voice notes
// render above the text but outside the <form>, since they carry their own forms.
// Recording a voice note adds what was said to the end of the body.
//
// As a preview it shows what the list knew (date, tags, body, how many voice
// notes) while the entry loads. Everything but the back button is inert then:
// the voice notes and tag suggestions aren't there yet, and the editor that
// replaces the preview starts over from the server's copy.
export function EntryEditor({
  entry,
  tagSuggestions,
  recordings,
  menu,
  preview,
}: {
  entry: Pick<Entry, "id" | "entry_date" | "body" | "tags">;
  tagSuggestions: string[];
  recordings: { recording: Recording; src: string }[];
  menu: ReactNode;
  preview?: { voiceNotes: number };
}) {
  const formId = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [date, setDate] = useState(entry.entry_date);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [localNotes, setLocalNotes] = useState<ReadonlyMap<string, LocalVoiceNote>>(new Map());
  const notes = voiceNotes(recordings, localNotes);

  // Transcripts to add to the body, applied in the render that shows them in
  // their tiles so both appear at once.
  const [arrivedText, setArrivedText] = useState<readonly string[]>([]);
  const appliedText = useRef(0);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    for (const text of arrivedText.slice(appliedText.current)) {
      body.value = appendParagraph(body.value, text);
    }
    appliedText.current = arrivedText.length;
  }, [arrivedText]);

  // Local copies of recorded audio live as long as the editor.
  const audioUrls = useRef<string[]>([]);
  useEffect(() => () => audioUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // The list's copy of the text is out of date once this entry is saved or a
  // voice note is transcribed into it; it is fetched again when next shown.
  const queryClient = useQueryClient();
  const { queryKey } = bodyQuery(entry.id);
  useEffect(() => {
    if (preview) return;
    return () => void queryClient.invalidateQueries({ queryKey });
    // oxlint-disable-next-line react/exhaustive-deps -- the key's id doesn't change
  }, [queryClient, preview]);

  function updateNote(id: string, next: (note?: LocalVoiceNote) => LocalVoiceNote | undefined) {
    setLocalNotes((current) => {
      const copy = new Map(current);
      const note = next(current.get(id));
      if (note) copy.set(id, note);
      else copy.delete(id);
      return copy;
    });
  }

  async function transcribe(
    recordingId: string,
    work: () => Promise<TranscriptOutcome>,
    recorded?: { audio: Blob; durationMs: number },
  ) {
    let src: string | undefined;
    if (recorded) {
      src = URL.createObjectURL(recorded.audio);
      audioUrls.current.push(src);
    }
    updateNote(recordingId, (note) => ({
      src: src ?? note?.src,
      durationMs: recorded?.durationMs ?? note?.durationMs,
      transcription: "running",
    }));

    let outcome: TranscriptOutcome;
    try {
      outcome = await work();
    } catch (e) {
      // Back to what was saved; a recording that never saved disappears.
      updateNote(recordingId, (note) => note && { src: note.src, durationMs: note.durationMs });
      throw e;
    }
    // One render: the tile shows the transcript as the body gains its text.
    updateNote(recordingId, (note) => ({ ...note, transcription: outcome }));
    const { transcript } = outcome;
    if (transcript) setArrivedText((texts) => [...texts, transcript]);
  }

  function forget(recordingId: string) {
    updateNote(recordingId, () => undefined);
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
    <VoiceNotesContext value={{ transcribe, forget }}>
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
        <div className="flex items-center gap-1 rounded-full glass p-1" inert={Boolean(preview)}>
          <VoiceRecorder entryId={entry.id} entryDate={date} />
        </div>
        <div className="flex items-center gap-2 justify-self-end" inert={Boolean(preview)}>
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

      <div className="mx-auto w-full max-w-2xl pt-4" inert={Boolean(preview)}>
        {/* A tile's height, so the real tiles take their place without a shift. */}
        {preview && preview.voiceNotes > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            {Array.from({ length: preview.voiceNotes }, (_, i) => (
              <Skeleton key={i} className="h-22 rounded-2xl" />
            ))}
          </div>
        )}
        {notes.length > 0 && (
          <ul className="mb-6 flex flex-col gap-3">
            {notes.map((note) => (
              <RecordingItem key={note.id} note={note} />
            ))}
          </ul>
        )}
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
    </VoiceNotesContext>
  );
}
