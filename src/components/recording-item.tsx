import { deleteRecording, retryTranscription } from "@/app/(journal)/entries/actions";
import type { Recording } from "@/lib/database.types";
import { AudioPlayer } from "./audio-player";
import { CopyButton } from "./copy-button";
import { RecordingMenu } from "./recording-menu";

// A voice note shown like a Journal attachment tile: the audio, then the
// original transcript with a copy button. The same text was also added to the
// entry's body, where it can be edited; this keeps what was actually said.
export function RecordingItem({ recording, src }: { recording: Recording; src: string }) {
  return (
    <li className="rounded-2xl bg-primary/8 p-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <AudioPlayer src={src} durationMs={recording.duration_ms} />
        </div>
        <RecordingMenu
          retryAction={
            recording.transcript_status === "done"
              ? undefined
              : retryTranscription.bind(null, recording.id)
          }
          deleteAction={deleteRecording.bind(null, recording.id)}
        />
      </div>
      {recording.transcript_status === "done" && recording.transcript ? (
        <div className="mt-2 flex items-start gap-2">
          <p className="min-w-0 flex-1 px-1 pt-0.5 text-[15px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {recording.transcript}
          </p>
          <CopyButton text={recording.transcript} label="Copy transcript" />
        </div>
      ) : (
        <p className="mt-2 px-1 text-[13px] text-muted-foreground">
          {recording.transcript_status === "done"
            ? "No speech detected."
            : recording.transcript_status === "failed"
              ? "Couldn't turn this into text. Try again from the menu."
              : "Turning this into text didn't finish. Try again from the menu."}
        </p>
      )}
    </li>
  );
}
