import { createServerFn } from "@tanstack/react-start";
import { audioExtension, MAX_RECORDING_BYTES } from "@/lib/audio";
import { requireUser } from "@/lib/auth";
import type { Recording } from "@/lib/database.types";
import { appendParagraph } from "@/lib/entry-body";
import { currentDate } from "@/lib/format";
import { normalizeTags } from "@/lib/tags";
import { deleteObjects, objectSize, presignPlayback, presignUpload, readObject } from "@/lib/r2";
import { containsPattern, searchExcerpt } from "@/lib/search";
import type { getSupabase } from "@/lib/supabase/server";
import { transcribe } from "@/lib/transcribe";
import type { TranscriptOutcome } from "@/lib/voice-notes";

type Supabase = ReturnType<typeof getSupabase>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// A page of cards asks for its bodies at once; more than a few pages is a mistake.
const MAX_IDS = 100;

// Arguments arrive from the browser, so each server function checks their shape.
function uuid(value: unknown) {
  if (typeof value !== "string" || !UUID.test(value)) throw new Error("Invalid id");
  return value;
}

function text(value: unknown) {
  if (typeof value !== "string") throw new Error("Invalid argument");
  return value;
}

function isoDate(value: unknown) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) throw new Error("Invalid date");
  return value;
}

// An entry with its voice notes, each with a URL to play it from. No row yet
// means a draft opened by "New entry"; its first save or voice note creates it,
// on `date` when the draft was opened for a day.
export const getEntry = createServerFn({ method: "GET" })
  .validator((input: { id: string; date?: string }) => ({
    id: uuid(input.id),
    date: input.date === undefined ? undefined : isoDate(input.date),
  }))
  .handler(async ({ data: { id, date } }) => {
    const { supabase } = await requireUser();
    const [{ data: row }, { data: tagRows }] = await Promise.all([
      supabase
        .from("entries")
        .select("*, recordings(*)")
        .eq("id", id)
        .order("created_at", { referencedTable: "recordings" })
        .maybeSingle(),
      // Every tag the user has used, for the editor's suggestions.
      supabase.from("entries").select("tags"),
    ]);

    const entry = row ?? {
      id,
      entry_date: date ?? currentDate(),
      body: "",
      tags: [],
      recordings: [],
    };
    const tagSuggestions = [...new Set((tagRows ?? []).flatMap((r) => r.tags))].sort((a, b) =>
      a.localeCompare(b),
    );
    const recordings = await Promise.all(
      entry.recordings.map(async (recording) => ({
        recording,
        src: await presignPlayback(recording.object_key),
      })),
    );
    return { entry, tagSuggestions, recordings };
  });

// The bodies of these entries. The list holds every entry's date, tags and
// voice notes, and asks for bodies only for the cards it is about to show.
export const getEntryBodies = createServerFn({ method: "GET" })
  .validator((ids: string[]) => {
    if (!Array.isArray(ids) || ids.length > MAX_IDS) throw new Error("Invalid ids");
    return ids.map(uuid);
  })
  .handler(async ({ data: ids }) => {
    if (ids.length === 0) return [];
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("entries").select("id, body").in("id", ids);
    if (error) throw error;
    return data;
  });

// The entries whose body contains q, as ids with the excerpt to show. The list
// already holds each entry's date, tags and voice notes; only the full bodies
// stay on the server, so the search runs here.
export const searchEntries = createServerFn({ method: "GET" })
  .validator((q: string) => text(q).trim())
  .handler(async ({ data: q }) => {
    if (!q) return [];
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("entries")
      .select("id, body")
      .ilike("body", containsPattern(q));
    if (error) throw error;
    return data.map(({ id, body }) => ({ id, excerpt: searchExcerpt(body, q) }));
  });

// Upserts: a draft entry (see NewEntryButton) gets its row on the first save.
export const saveEntry = createServerFn({ method: "POST" })
  .validator((input: { entryId: string; body: string; entryDate: string }) => ({
    entryId: uuid(input.entryId),
    body: text(input.body),
    entryDate: isoDate(input.entryDate),
  }))
  .handler(async ({ data }): Promise<{ error?: string }> => {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("entries").upsert({
      id: data.entryId,
      body: data.body,
      entry_date: data.entryDate,
      updated_at: new Date().toISOString(),
    });
    return error ? { error: error.message } : {};
  });

// Tags save on their own, as soon as they change. A draft entry gets its row
// here if tagging is the first thing done to it; an existing row keeps its date.
export const saveEntryTags = createServerFn({ method: "POST" })
  .validator((input: { entryId: string; entryDate: string; tags: string[] }) => {
    if (!Array.isArray(input.tags)) throw new Error("Invalid tags");
    return {
      entryId: uuid(input.entryId),
      entryDate: isoDate(input.entryDate),
      tags: input.tags.map(text),
    };
  })
  .handler(async ({ data }): Promise<{ error?: string }> => {
    const { supabase } = await requireUser();
    const { error: createError } = await supabase
      .from("entries")
      .upsert({ id: data.entryId, entry_date: data.entryDate }, { ignoreDuplicates: true });
    if (createError) return { error: createError.message };
    const { error } = await supabase
      .from("entries")
      .update({ tags: normalizeTags(data.tags) })
      .eq("id", data.entryId);
    return error ? { error: error.message } : {};
  });

export const deleteEntry = createServerFn({ method: "POST" })
  .validator(uuid)
  .handler(async ({ data: entryId }) => {
    const { supabase } = await requireUser();
    const { data: recordings, error } = await supabase
      .from("recordings")
      .select("object_key")
      .eq("entry_id", entryId);
    if (error) throw error;
    await deleteObjects(recordings.map((r) => r.object_key));
    const { error: deleteError } = await supabase.from("entries").delete().eq("id", entryId);
    if (deleteError) throw deleteError;
  });

// Step 1 of saving a voice note, and of transcribing each part of it while it
// is recorded: hand the browser a short-lived URL so it uploads the audio
// straight to R2 instead of through this server.
export const createRecordingUpload = createServerFn({ method: "POST" })
  .validator((input: { entryId: string; entryDate: string; mimeType: string }) => ({
    entryId: uuid(input.entryId),
    entryDate: isoDate(input.entryDate),
    mimeType: text(input.mimeType),
  }))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser();
    const extension = audioExtension(data.mimeType);
    if (!extension) return { error: `Unsupported audio format: ${data.mimeType}` } as const;

    // A draft entry gets its row with its first voice note; an existing row is left as is.
    const { error } = await supabase
      .from("entries")
      .upsert({ id: data.entryId, entry_date: data.entryDate }, { ignoreDuplicates: true });
    if (error) return { error: error.message } as const;

    const key = `${userId}/${data.entryId}/${crypto.randomUUID()}.${extension}`;
    return { key, url: await presignUpload(key, data.mimeType) } as const;
  });

// Transcribes one part of a recording in progress, uploaded with
// createRecordingUpload, then deletes it; the whole recording is saved on its own.
export const transcribeSegment = createServerFn({ method: "POST" })
  .validator((input: { entryId: string; key: string; mimeType: string }) => ({
    entryId: uuid(input.entryId),
    key: text(input.key),
    mimeType: text(input.mimeType),
  }))
  .handler(async ({ data: { entryId, key, mimeType } }) => {
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
  });

// Step 2: once the upload finished, record it so the voice note shows up right
// away. The browser picks its id so it can mark it as transcribing beforehand.
// When every part was transcribed while recording, their joined text comes
// along and is added to the entry here; otherwise transcribeRecording follows.
export const saveRecording = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id: string;
      entryId: string;
      key: string;
      mimeType: string;
      durationMs: number;
      transcript?: string;
    }) => {
      if (!Number.isFinite(input.durationMs)) throw new Error("Invalid duration");
      return {
        id: uuid(input.id),
        entryId: uuid(input.entryId),
        key: text(input.key),
        mimeType: text(input.mimeType),
        durationMs: input.durationMs,
        transcript: input.transcript === undefined ? undefined : text(input.transcript),
      };
    },
  )
  .handler(async ({ data: input }): Promise<{ error?: string }> => {
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
    return {};
  });

// Step 3, and the retry for a voice note whose text is missing: transcribe it
// and add the text to the end of the entry. Returns the outcome so the open
// editor can show it and add the text too.
export const transcribeRecording = createServerFn({ method: "POST" })
  .validator(uuid)
  .handler(async ({ data: recordingId }): Promise<TranscriptOutcome> => {
    const { supabase } = await requireUser();
    const { data: recording } = await supabase
      .from("recordings")
      .select()
      .eq("id", recordingId)
      .maybeSingle();
    if (!recording) return { status: "failed", transcript: null };
    return runTranscription(supabase, recording);
  });

// The row goes first: should deleting the audio then fail, what's left is a
// file nothing points to, rather than a voice note whose audio is gone.
export const deleteRecording = createServerFn({ method: "POST" })
  .validator(uuid)
  .handler(async ({ data: recordingId }): Promise<{ error?: string }> => {
    const { supabase } = await requireUser();
    const { data: recording, error } = await supabase
      .from("recordings")
      .delete()
      .eq("id", recordingId)
      .select("object_key")
      .maybeSingle();
    if (error) return { error: error.message };
    if (recording) await deleteObjects([recording.object_key]);
    return {};
  });

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
