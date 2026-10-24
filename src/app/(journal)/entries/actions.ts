"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { audioExtension, MAX_RECORDING_BYTES } from "@/lib/audio";
import { requireUser } from "@/lib/auth";
import type { Recording } from "@/lib/database.types";
import { appendParagraph } from "@/lib/entry-body";
import { normalizeTags } from "@/lib/tags";
import { deleteObjects, objectSize, presignUpload, readObject } from "@/lib/r2";
import type { createClient } from "@/lib/supabase/server";
import { transcribe } from "@/lib/transcribe";
import type { TranscriptOutcome } from "@/lib/voice-notes";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Upserts: a draft entry (see NewEntryButton) gets its row on the first save.
export async function saveEntry(entryId: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("entries").upsert({
    id: entryId,
    body: String(formData.get("body") ?? ""),
    entry_date: String(formData.get("entry_date") ?? ""),
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  refresh();
  return {};
}

// Tags save on their own, as soon as they change. A draft entry gets its row
// here if tagging is the first thing done to it; an existing row keeps its date.
export async function saveEntryTags(
  entryId: string,
  entryDate: string,
  tags: string[],
): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { error: createError } = await supabase
    .from("entries")
    .upsert({ id: entryId, entry_date: entryDate }, { ignoreDuplicates: true });
  if (createError) return { error: createError.message };
  const { error } = await supabase
    .from("entries")
    .update({ tags: normalizeTags(tags) })
    .eq("id", entryId);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteEntry(entryId: string) {
  const { supabase } = await requireUser();
  const { data: recordings, error } = await supabase
    .from("recordings")
    .select("object_key")
    .eq("entry_id", entryId);
  if (error) throw error;
  await deleteObjects(recordings.map((r) => r.object_key));
  const { error: deleteError } = await supabase.from("entries").delete().eq("id", entryId);
  if (deleteError) throw deleteError;
  refresh();
  redirect("/");
}

// Step 1 of saving a voice note, and of transcribing each part of it while it
// is recorded: hand the browser a short-lived URL so it uploads the audio
// straight to R2 instead of through this server.
export async function createRecordingUpload(entryId: string, entryDate: string, mimeType: string) {
  const { supabase, userId } = await requireUser();
  const extension = audioExtension(mimeType);
  if (!extension) return { error: `Unsupported audio format: ${mimeType}` } as const;

  // A draft entry gets its row with its first voice note; an existing row is left as is.
  const { error } = await supabase
    .from("entries")
    .upsert({ id: entryId, entry_date: entryDate }, { ignoreDuplicates: true });
  if (error) return { error: error.message } as const;

  const key = `${userId}/${entryId}/${crypto.randomUUID()}.${extension}`;
  return { key, url: await presignUpload(key, mimeType) } as const;
}

// Transcribes one part of a recording in progress, uploaded with
// createRecordingUpload, then deletes it; the whole recording is saved on its own.
export async function transcribeSegment(
  entryId: string,
  key: string,
  mimeType: string,
): Promise<{ transcript: string } | { error: string }> {
  const { userId } = await requireUser();
  if (!key.startsWith(`${userId}/${entryId}/`)) return { error: "Invalid upload" };
  try {
    const size = await objectSize(key);
    if (size === 0 || size > MAX_RECORDING_BYTES) {
      return { error: "Recording is empty or larger than 25 MB" };
    }
    const audio = await readObject(key);
    return { transcript: await transcribe(audio, key.split("/").pop()!, mimeType) };
  } catch (error) {
    console.error("Segment transcription failed", key, error);
    return { error: "Couldn't turn this part into text" };
  } finally {
    await deleteObjects([key]);
  }
}

// Step 2: once the upload finished, record it so the voice note shows up right
// away. The browser picks its id so it can mark it as transcribing beforehand.
// When every part was transcribed while recording, their joined text comes
// along and is added to the entry here; otherwise transcribeRecording follows.
export async function saveRecording(input: {
  id: string;
  entryId: string;
  key: string;
  mimeType: string;
  durationMs: number;
  transcript?: string;
}) {
  const { supabase, userId } = await requireUser();
  if (!input.key.startsWith(`${userId}/${input.entryId}/`)) return { error: "Invalid upload" };

  const size = await objectSize(input.key);
  if (size === 0 || size > MAX_RECORDING_BYTES) {
    await deleteObjects([input.key]);
    return { error: "Recording is empty or larger than 25 MB" };
  }

  const { error } = await supabase.from("recordings").insert({
    id: input.id,
    entry_id: input.entryId,
    object_key: input.key,
    mime_type: input.mimeType,
    duration_ms: Math.round(input.durationMs),
    ...(input.transcript !== undefined && {
      transcript: input.transcript || null,
      transcript_status: "done",
    }),
  });
  if (error) {
    await deleteObjects([input.key]);
    return { error: error.message };
  }
  if (input.transcript) await appendTranscript(supabase, input.entryId, input.transcript);

  refresh();
  return {};
}

// Step 3, and the retry for a voice note whose text is missing: transcribe it
// and add the text to the end of the entry. Returns the outcome so the open
// editor can show it and add the text too.
export async function transcribeRecording(recordingId: string): Promise<TranscriptOutcome> {
  const { supabase } = await requireUser();
  const { data: recording } = await supabase
    .from("recordings")
    .select()
    .eq("id", recordingId)
    .maybeSingle();
  if (!recording) return { status: "failed", transcript: null };
  const outcome = await runTranscription(supabase, recording);
  refresh();
  return outcome;
}

// The row goes first: should deleting the audio then fail, what's left is a
// file nothing points to, rather than a voice note whose audio is gone.
export async function deleteRecording(recordingId: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { data: recording, error } = await supabase
    .from("recordings")
    .delete()
    .eq("id", recordingId)
    .select("object_key")
    .maybeSingle();
  if (error) return { error: error.message };
  if (recording) await deleteObjects([recording.object_key]);
  refresh();
  return {};
}

// Transcribes a recording and appends the text to its entry's body. The
// transcript is null when there was no speech or transcription failed.
async function runTranscription(
  supabase: Supabase,
  recording: Recording,
): Promise<TranscriptOutcome> {
  try {
    const audio = await readObject(recording.object_key);
    const fileName = recording.object_key.split("/").pop()!;
    const transcript = await transcribe(audio, fileName, recording.mime_type);
    await supabase
      .from("recordings")
      .update({ transcript, transcript_status: "done" })
      .eq("id", recording.id);
    if (!transcript) return { status: "done", transcript: null };
    await appendTranscript(supabase, recording.entry_id, transcript);
    return { status: "done", transcript };
  } catch (error) {
    console.error("Transcription failed", recording.id, error);
    await supabase
      .from("recordings")
      .update({ transcript_status: "failed" })
      .eq("id", recording.id);
    return { status: "failed", transcript: null };
  }
}

async function appendTranscript(supabase: Supabase, entryId: string, transcript: string) {
  const { data: entry, error } = await supabase
    .from("entries")
    .select("body")
    .eq("id", entryId)
    .single();
  if (error) throw error;
  await supabase
    .from("entries")
    .update({
      body: appendParagraph(entry.body, transcript),
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);
}
