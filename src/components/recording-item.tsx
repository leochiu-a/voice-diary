import { ChevronRightIcon } from "lucide-react";
import { deleteRecording, transcribeRecording } from "@/app/(journal)/entries/actions";
import type { Recording } from "@/lib/database.types";
import { AudioPlayer } from "./audio-player";
import { CopyButton } from "./copy-button";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { RecordingMenu } from "./recording-menu";
import { RecordingStatus } from "./recording-status";

// A voice note shown like a Journal attachment tile: the audio, with the
// original transcript folded away under a toggle, plus a button to copy it.
// The same text was added to the entry's body, where it can be edited; the
// transcript keeps what was actually said.
export function RecordingItem({ recording, src }: { recording: Recording; src: string }) {
  return (
    <li className="rounded-2xl bg-primary/8 p-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <AudioPlayer src={src} durationMs={recording.duration_ms} />
        </div>
        <RecordingMenu
          recordingId={recording.id}
          retryAction={
            recording.transcript_status === "done"
              ? undefined
              : transcribeRecording.bind(null, recording.id)
          }
          deleteAction={deleteRecording.bind(null, recording.id)}
        />
      </div>
      {recording.transcript_status === "done" && recording.transcript ? (
        <Collapsible className="mt-1">
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
                {recording.transcript}
              </p>
              <CopyButton text={recording.transcript} label="Copy transcript" />
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <RecordingStatus recordingId={recording.id} status={recording.transcript_status} />
      )}
    </li>
  );
}
