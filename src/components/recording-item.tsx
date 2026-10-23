import { deleteRecording, retryTranscription } from "@/app/(journal)/entries/actions";
import type { Recording } from "@/lib/database.types";
import { AudioPlayer } from "./audio-player";
import { RecordingMenu } from "./recording-menu";

// A voice note shown like a Journal attachment tile, with its transcript underneath.
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
      <p className="mt-2.5 px-1 text-[15px] leading-relaxed whitespace-pre-wrap">
        {recording.transcript_status === "done"
          ? recording.transcript || "(No speech detected)"
          : recording.transcript_status === "failed"
            ? "Transcription failed."
            : "Transcription didn't finish."}
      </p>
    </li>
  );
}
