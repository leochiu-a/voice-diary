"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { audioExtension, MAX_RECORDING_BYTES } from "@/lib/audio";
import { requireUser } from "@/lib/auth";
import type { Recording } from "@/lib/database.types";
import { normalizeTags } from "@/lib/tags";
import { deleteObjects, objectSize, presignUpload, readObject } from "@/lib/r2";
import type { createClient } from "@/lib/supabase/server";
import { transcribe } from "@/lib/transcribe";

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

// Step 1 of saving a voice note: hand the browser a short-lived URL so it
// uploads the audio straight to R2 instead of through this server.
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

// Step 2: once the upload finished, record it and transcribe it.
export async function saveRecording(input: {
  entryId: string;
  key: string;
  mimeType: string;
  durationMs: number;
}) {
  const { supabase, userId } = await requireUser();
  if (!input.key.startsWith(`${userId}/${input.entryId}/`)) return { error: "Invalid upload" };

  const size = await objectSize(input.key);
  if (size === 0 || size > MAX_RECORDING_BYTES) {
    await deleteObjects([input.key]);
    return { error: "Recording is empty or larger than 25 MB" };
  }

  const { data: recording, error } = await supabase
    .from("recordings")
    .insert({
      entry_id: input.entryId,
      object_key: input.key,
      mime_type: input.mimeType,
      duration_ms: Math.round(input.durationMs),
    })
    .select()
    .single();
  if (error) {
    await deleteObjects([input.key]);
    return { error: error.message };
  }

  await runTranscription(supabase, recording);
  refresh();
  return {};
}

export async function retryTranscription(recordingId: string) {
  const { supabase } = await requireUser();
  const { data: recording } = await supabase
    .from("recordings")
    .select()
    .eq("id", recordingId)
    .maybeSingle();
  if (!recording) return;
  await runTranscription(supabase, recording);
  refresh();
}

export async function deleteRecording(recordingId: string) {
  const { supabase } = await requireUser();
  const { data: recording } = await supabase
    .from("recordings")
    .select("object_key")
    .eq("id", recordingId)
    .maybeSingle();
  if (!recording) return;
  await deleteObjects([recording.object_key]);
  await supabase.from("recordings").delete().eq("id", recordingId);
  refresh();
}

async function runTranscription(supabase: Supabase, recording: Recording) {
  try {
    const audio = await readObject(recording.object_key);
    const fileName = recording.object_key.split("/").pop()!;
    const transcript = await transcribe(audio, fileName, recording.mime_type);
    await supabase
      .from("recordings")
      .update({ transcript, transcript_status: "done" })
      .eq("id", recording.id);
  } catch (error) {
    console.error("Transcription failed", recording.id, error);
    await supabase
      .from("recordings")
      .update({ transcript_status: "failed" })
      .eq("id", recording.id);
  }
}
