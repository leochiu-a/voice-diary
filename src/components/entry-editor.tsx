import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ChevronLeftIcon, PencilIcon, TagIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { flushSync } from "react-dom";
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
import { formatEntryDate } from "@/lib/format";
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
// recorder pinned to the bottom within thumb reach. The controls stay put
// while the content scrolls, or swipes to another entry, beneath them. Voice notes
// render above the text but outside the <form>, since they carry their own forms.
// Recording a voice note adds what was said to the end of the body.
//
// As a preview it shows an entry read-only (see EntryPreview): its voice
// notes, or placeholders for them when only the list's copy is at hand.
// Everything but the back button is inert then, and the
// editor that replaces the preview starts over from the server's copy.
export function EntryEditor({
  entry,
  tagSuggestions,
  recordings,
  menu,
  preview,
  pages,
  contentOnly,
  title,
  startEditing = false,
}: {
  entry: Pick<Entry, "id" | "entry_date" | "body" | "tags">;
  tagSuggestions: string[];
  recordings: { recording: Recording; src: string }[];
  menu: ReactNode;
  preview?: { voiceNotes: number };
  // How the content scrolls under the controls, by default on its own.
  pages?: (content: ReactNode) => ReactNode;
  // Just the content, as a page beside the open entry (see EntryPager).
  contentOnly?: boolean;
  // Shown between the controls while reading (see ListPosition).
  title?: ReactNode;
  // A new draft opens ready to write; a saved entry opens to read.
  startEditing?: boolean;
}) {
  const formId = useId();
  const refresh = useRefresh();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState(startEditing && !preview);
  const [date, setDate] = useState(entry.entry_date);
  const [tags, setTags] = useState(entry.tags);
  // The text as last saved, which reading shows.
  const [body, setBody] = useState(entry.body);
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

  // The check button saves and goes back to reading; ⌘S saves and keeps writing.
  function save(form: HTMLFormElement, done: boolean) {
    const formData = new FormData(form);
    const text = String(formData.get("body") ?? "");
    startTransition(async () => {
      const result = await saveEntry({
        data: {
          entryId: entry.id,
          body: text,
          entryDate: String(formData.get("entry_date") ?? ""),
        },
      });
      setError(result.error);
      if (result.error) return;
      setBody(text);
      refresh();
      if (done) setEditing(false);
    });
  }

  // Rendered in the tap itself, so the text field can take focus and phones
  // bring up the keyboard; the caret goes to the end, to carry on writing.
  function edit() {
    flushSync(() => setEditing(true));
    const field = bodyRef.current;
    field?.focus();
    field?.setSelectionRange(field.value.length, field.value.length);
  }

  const content = (
    <div className="px-5 pt-22 pb-28 md:px-8 md:pt-20 md:pb-8" inert={Boolean(preview)}>
      <div className="mx-auto w-full max-w-2xl">
        {preview && notes.length === 0 && preview.voiceNotes > 0 && (
          <ul className="mb-6 flex flex-col gap-3">
            {Array.from({ length: preview.voiceNotes }, (_, i) => (
              <RecordingItemSkeleton key={i} />
            ))}
          </ul>
        )}
        {notes.length > 0 && (
          <ul className="mb-6 flex flex-col gap-3">
            {notes.map((note) => (
              <RecordingItem key={note.id} note={note} editable={editing} />
            ))}
          </ul>
        )}
        {editing ? (
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the form listens for ⌘S to save
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
                defaultTags={tags}
                suggestions={tagSuggestions}
                onChange={setTags}
              />
            </div>

            <textarea
              ref={bodyRef}
              name="body"
              defaultValue={body}
              placeholder="Start writing…"
              aria-label="Entry"
              className="mt-4 field-sizing-content min-h-80 w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
            />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </form>
        ) : (
          <div className="flex flex-col">
            <p className="w-fit py-0.5 text-[13px] text-muted-foreground">
              {formatEntryDate(date, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {tags.length > 0 && (
              <ul aria-label="Tags" className="mt-2 flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="flex h-7 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-[13px] font-medium text-primary"
                  >
                    <TagIcon className="size-3.5" aria-hidden />
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[17px] leading-relaxed whitespace-pre-wrap">{body}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <VoiceNotesContext value={{ transcribe, remove: (id) => void remove(id) }}>
      {contentOnly ? (
        content
      ) : (
        <>
          {pages ? pages(content) : <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>}

          {/* Over the content, which scrolls behind it. As on the list, only
              the controls have glass surfaces; there is no bar behind them.
              Fixed on phones, where it spans the screen anyway: iOS blurs
              page content under the status bar, but not what is fixed there. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-5 py-3 max-md:fixed md:gap-3 md:px-8 max-md:[&_svg]:size-5 [&>*]:pointer-events-auto">
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
            {editing ? (
              <div className="absolute left-1/2 -translate-x-1/2">
                <RecordButton popover={recorderPopover} />
              </div>
            ) : (
              title
            )}
            <div className="flex items-center gap-2.5 md:gap-2" inert={Boolean(preview)}>
              {menu}
              {/* Keyed apart: the tap on Edit would otherwise finish on the
                  same element turned into Done, and submit. */}
              {editing ? (
                <Button
                  key="done"
                  type="submit"
                  form={formId}
                  size="icon-lg"
                  disabled={pending}
                  aria-label={pending ? "Saving" : "Done"}
                  className="size-12 rounded-full shadow-md shadow-primary/30 md:size-10"
                >
                  <CheckIcon />
                </Button>
              ) : (
                <Button
                  key="edit"
                  variant="glass"
                  size="icon-lg"
                  aria-label="Edit"
                  title="Edit"
                  onClick={edit}
                  className="size-12 md:size-10"
                >
                  <PencilIcon />
                </Button>
              )}
            </div>
          </div>

          {/* While writing, at the foot of the screen over the content. The
              recorder's sheet opens in it too, centered over the entry. */}
          {editing && (
            <div
              ref={setRecorderBar}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pt-3 pb-[max(env(safe-area-inset-bottom),1.5rem)] max-md:fixed max-md:[&_svg]:size-5"
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
          )}
        </>
      )}
    </VoiceNotesContext>
  );
}
