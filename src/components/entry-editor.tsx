import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ChevronLeftIcon } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { Entry, Recording } from "@/lib/database.types";
import { bodyQuery } from "@/lib/entry-bodies";
import { appendParagraph } from "@/lib/entry-body";
import { useRefresh } from "@/lib/queries";
import { type LocalVoiceNote, type TranscriptOutcome, voiceNotes } from "@/lib/voice-notes";
import { deleteRecording, saveEntry } from "@/server/entries";
import { Button } from "@/components/ui/button";
import { EntryDatePicker } from "./entry-date-picker";
import { RecordingItem, RecordingItemSkeleton } from "./recording-item";
import { TagPicker } from "./tag-picker";
import { VoiceNotesContext } from "./voice-notes-context";
import { createRecorderPopover, RecordButton, VoiceRecorder } from "./voice-recorder";

// Journal-style editor: floating glass controls over a plain page, with the
// recorder pinned to the bottom within thumb reach. Voice notes
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
  const navigate = useNavigate();
  const refresh = useRefresh();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [date, setDate] = useState(entry.entry_date);
  const [recorderBar, setRecorderBar] = useState<HTMLDivElement | null>(null);
  const [recorderPopover] = useState(createRecorderPopover);
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
    refresh();
    const { transcript } = outcome;
    if (transcript) setArrivedText((texts) => [...texts, transcript]);
  }

  // The voice note goes at once; if the server can't delete it, it comes back.
  async function remove(recordingId: string) {
    setError(undefined);
    updateNote(recordingId, (note) => ({ ...note, deleted: true }));
    const result = await deleteRecording({ data: recordingId }).catch(() => ({ error: "offline" }));
    if (result.error) {
      updateNote(recordingId, (note) => note && { ...note, deleted: false });
      setError("Couldn't delete the voice note. Try again.");
    } else refresh();
  }

  // The check button saves and returns to the journal; ⌘S saves in place.
  function save(form: HTMLFormElement, leave: boolean) {
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await saveEntry({
        data: {
          entryId: entry.id,
          body: String(formData.get("body") ?? ""),
          entryDate: String(formData.get("entry_date") ?? ""),
        },
      });
      setError(result.error);
      if (result.error) return;
      refresh();
      if (leave) await navigate({ to: "/" });
    });
  }

  return (
    <VoiceNotesContext value={{ transcribe, remove: (id) => void remove(id) }}>
      {/* Match the list: mobile content fades out behind the glass controls;
          desktop keeps a frosted toolbar surface. */}
      <div className="journal-toolbar sticky top-0 z-10 -mx-5 flex items-center justify-between gap-2 px-5 py-3 [--journal-toolbar-surface:var(--card)] md:-mx-8 md:gap-3 md:px-8 max-md:[&_svg]:size-5">
        <Button
          variant="glass"
          size="icon-lg"
          nativeButton={false}
          render={<Link to="/" aria-label="Back to journal" />}
          className="size-12 md:size-10"
        >
          <ChevronLeftIcon />
        </Button>
        {/* Centered over the entry, where new voice notes appear. */}
        <div className="absolute left-1/2 -translate-x-1/2" inert={Boolean(preview)}>
          <RecordButton popover={recorderPopover} />
        </div>
        <div className="flex items-center gap-2" inert={Boolean(preview)}>
          {menu}
          <Button
            type="submit"
            form={formId}
            size="icon-lg"
            disabled={pending}
            aria-label={pending ? "Saving" : "Done"}
            className="size-12 rounded-full shadow-md shadow-primary/30 md:size-10"
          >
            <CheckIcon />
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 pt-4" inert={Boolean(preview)}>
        {preview && preview.voiceNotes > 0 && (
          <ul className="mb-6 flex flex-col gap-3">
            {Array.from({ length: preview.voiceNotes }, (_, i) => (
              <RecordingItemSkeleton key={i} />
            ))}
          </ul>
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

      {/* The page is at least a screen tall, so this rests at its foot and then
          stays there as a long entry scrolls behind it. The recorder's sheet
          opens in it too, centered over the entry. */}
      <div
        ref={setRecorderBar}
        className="pointer-events-none sticky bottom-0 z-10 flex justify-center pt-3 pb-[max(env(safe-area-inset-bottom),1.5rem)] max-md:[&_svg]:size-5"
        inert={Boolean(preview)}
      >
        <div className="pointer-events-auto">
          <VoiceRecorder
            entryId={entry.id}
            entryDate={date}
            sheetContainer={recorderBar}
            popover={recorderPopover}
          />
        </div>
      </div>
    </VoiceNotesContext>
  );
}
