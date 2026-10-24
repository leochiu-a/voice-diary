import type { Recording } from "@/lib/database.types";

export type TranscriptOutcome = {
  status: Recording["transcript_status"];
  transcript: string | null;
};

// What the open editor knows about a voice note beyond the saved page data: a
// local copy of audio recorded in this session, and a transcription it is
// running or has just finished. That outcome shows before the refreshed page
// data catches up, so the transcript lands in the tile and the body together.
export type LocalVoiceNote = {
  src?: string;
  durationMs?: number;
  transcription?: "running" | TranscriptOutcome;
};

export type VoiceNote = {
  id: string;
  src: string;
  durationMs: number | null;
  transcription: "running" | TranscriptOutcome;
};

export function voiceNotes(
  saved: readonly { recording: Recording; src: string }[],
  local: ReadonlyMap<string, LocalVoiceNote>,
): VoiceNote[] {
  const notes: VoiceNote[] = saved.map(({ recording, src }) => {
    const note = local.get(recording.id);
    return {
      id: recording.id,
      // Keep playing the local copy, so the player doesn't reload mid-listen.
      src: note?.src ?? src,
      durationMs: recording.duration_ms,
      transcription: note?.transcription ?? {
        status: recording.transcript_status,
        transcript: recording.transcript,
      },
    };
  });

  // Just recorded and not in the page data yet.
  const savedIds = new Set(notes.map((note) => note.id));
  for (const [id, note] of local) {
    if (savedIds.has(id) || !note.src || !note.transcription) continue;
    notes.push({
      id,
      src: note.src,
      durationMs: note.durationMs ?? null,
      transcription: note.transcription,
    });
  }
  return notes;
}

// A recording is transcribed a part at a time while it is made, and its parts
// read as one passage: Chinese runs on, while words in Latin script keep the
// space between them.
export function joinTranscripts(parts: readonly string[]) {
  return parts
    .filter(Boolean)
    .reduce(
      (text, part) =>
        /[\x21-\x7e]$/.test(text) && /^[\x21-\x7e]/.test(part) ? `${text} ${part}` : text + part,
      "",
    );
}
