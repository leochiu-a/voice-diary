import { MessageSquareQuoteIcon } from "lucide-react";
import type { VoiceNote } from "@/lib/voice-notes";
import { AudioPlayer } from "./audio-player";
import { CopyButton } from "./copy-button";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { RecordingMenu } from "./recording-menu";
import { Skeleton } from "./ui/skeleton";

// A voice note shown like a Journal attachment tile: the audio with its
// waveform, and the original transcript folded away behind the quote icon,
// plus a button to copy it. The same text was added to the entry's body, where
// it can be edited; the transcript keeps what was actually said. Retrying or
// deleting it, from its menu, is for while the entry is being edited.
export function RecordingItem({ note, editable }: { note: VoiceNote; editable: boolean }) {
  const { transcription } = note;
  const running = transcription === "running";
  const transcript = !running && transcription.status === "done" ? transcription.transcript : null;
  return (
    <li className="animate-in rounded-2xl bg-primary/8 p-3 duration-300 fade-in motion-reduce:animate-none">
      <Collapsible>
        <AudioPlayer recordingId={note.id} src={note.src} durationMs={note.durationMs}>
          {transcript && (
            <>
              <span aria-hidden className="text-muted-foreground">
                ·
              </span>
              <CollapsibleTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Transcript"
                    title="Transcript"
                    className="text-muted-foreground data-panel-open:text-primary"
                  />
                }
              >
                <MessageSquareQuoteIcon />
              </CollapsibleTrigger>
            </>
          )}
          {editable && (
            <div className="ml-auto">
              <RecordingMenu
                recordingId={note.id}
                busy={running}
                canRetry={!running && transcription.status !== "done"}
              />
            </div>
          )}
        </AudioPlayer>
        {transcript && (
          <CollapsibleContent>
            <div className="mt-1 flex items-start gap-2">
              <p className="min-w-0 flex-1 px-1 pt-0.5 text-[15px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {transcript}
              </p>
              <CopyButton text={transcript} label="Copy transcript" />
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
      {!transcript && (
        <p className="mt-1 px-1 text-[13px] text-muted-foreground" aria-live="polite">
          {running ? (
            <span className="animate-pulse motion-reduce:animate-none">
              Turning this into text…
            </span>
          ) : transcription.status === "done" ? (
            "No speech detected."
          ) : transcription.status === "failed" ? (
            "Couldn't turn this into text. Try again from the menu."
          ) : (
            "Turning this into text didn't finish. Try again from the menu."
          )}
        </p>
      )}
    </li>
  );
}

// Holds a tile's place while the entry loads: the same box, play-button row
// and waveform row, so the real tile takes its place without moving the text.
export function RecordingItemSkeleton() {
  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-primary/8 p-3">
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="h-10" />
    </li>
  );
}
