"use client";

import { createContext, use } from "react";

// Voice notes are transcribed after they show up. The editor runs each
// transcription so it can add the text to the body it is showing, matching what
// the server appended to the saved entry; without that the editor would keep
// its older text and overwrite the transcript on save. It also tracks which
// voice notes are still being transcribed, so their tiles can say so.
export type Transcription = {
  transcribing: ReadonlySet<string>;
  transcribe: (recordingId: string, work: () => Promise<string | null>) => Promise<void>;
};

export const TranscriptionContext = createContext<Transcription | null>(null);

export function useTranscription() {
  const transcription = use(TranscriptionContext);
  if (!transcription) throw new Error("useTranscription must be used inside EntryEditor");
  return transcription;
}
