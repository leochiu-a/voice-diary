import { createContext, use } from "react";
import type { TranscriptOutcome } from "@/lib/voice-notes";

// The editor owns the voice notes in flight. A new recording shows up as soon
// as it stops, playing from a local copy while it uploads and is transcribed.
// When a transcription finishes, its text lands in the tile and at the end of
// the body in the same render, matching what the server appended to the saved
// entry; without that the editor would keep its older text and overwrite the
// transcript on save.
export type VoiceNotes = {
  transcribe: (
    recordingId: string,
    work: () => Promise<TranscriptOutcome>,
    recorded?: { audio: Blob; durationMs: number },
  ) => Promise<void>;
  remove: (recordingId: string) => void;
};

export const VoiceNotesContext = createContext<VoiceNotes | null>(null);

export function useVoiceNotes() {
  const voiceNotes = use(VoiceNotesContext);
  if (!voiceNotes) throw new Error("useVoiceNotes must be used inside EntryEditor");
  return voiceNotes;
}
