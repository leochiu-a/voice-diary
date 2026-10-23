"use client";

import { ChevronRightIcon } from "lucide-react";
import type { VoiceNote } from "@/lib/voice-notes";
import { AudioPlayer } from "./audio-player";
import { CopyButton } from "./copy-button";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { RecordingMenu } from "./recording-menu";

// A voice note shown like a Journal attachment tile: the audio, with the
// original transcript folded away under a toggle, plus a button to copy it.
// The same text was added to the entry's body, where it can be edited; the
// transcript keeps what was actually said.
export function RecordingItem({ note }: { note: VoiceNote }) {
  const { transcription } = note;
  const running = transcription === "running";
  return (
    <li className="animate-in rounded-2xl bg-primary/8 p-3 duration-300 fade-in motion-reduce:animate-none">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <AudioPlayer src={note.src} durationMs={note.durationMs} />
        </div>
        <RecordingMenu
          recordingId={note.id}
          busy={running}
          canRetry={!running && transcription.status !== "done"}
        />
      </div>
      {!running && transcription.status === "done" && transcription.transcript ? (
        <Collapsible className="mt-1 animate-in duration-300 fade-in motion-reduce:animate-none">
          <CollapsibleTrigger
            render={
              <Button
                variant="ghost"
                size="xs"
                className="group/transcript text-muted-foreground"
              />
            }
          >
            <ChevronRightIcon
              data-icon="inline-start"
              className="transition-transform group-data-panel-open/transcript:rotate-90 motion-reduce:transition-none"
            />
            Transcript
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 flex items-start gap-2">
              <p className="min-w-0 flex-1 px-1 pt-0.5 text-[15px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {transcription.transcript}
              </p>
              <CopyButton text={transcription.transcript} label="Copy transcript" />
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <p className="mt-2 px-1 text-[13px] text-muted-foreground" aria-live="polite">
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
