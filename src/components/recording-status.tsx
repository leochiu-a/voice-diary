"use client";

import type { Recording } from "@/lib/database.types";
import { useTranscription } from "./transcription-context";

// Says why a voice note has no transcript to show. A pending one is either
// being transcribed right now or was left unfinished, e.g. by closing the page.
export function RecordingStatus({
  recordingId,
  status,
}: {
  recordingId: string;
  status: Recording["transcript_status"];
}) {
  const { transcribing } = useTranscription();
  return (
    <p className="mt-2 px-1 text-[13px] text-muted-foreground" aria-live="polite">
      {transcribing.has(recordingId)
        ? "Turning this into text…"
        : status === "done"
          ? "No speech detected."
          : status === "failed"
            ? "Couldn't turn this into text. Try again from the menu."
            : "Turning this into text didn't finish. Try again from the menu."}
    </p>
  );
}
