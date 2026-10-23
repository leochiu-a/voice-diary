import { expect, test } from "vitest";
import type { Recording } from "@/lib/database.types";
import { type LocalVoiceNote, voiceNotes } from "./voice-notes";

function recording(id: string, fields: Partial<Recording> = {}): Recording {
  return {
    id,
    entry_id: "entry",
    object_key: `user/entry/${id}.webm`,
    mime_type: "audio/webm",
    duration_ms: 3000,
    transcript: null,
    transcript_status: "pending",
    created_at: "2026-10-23T00:00:00Z",
    ...fields,
  } as Recording;
}

test("shows saved voice notes as saved", () => {
  const saved = [
    { recording: recording("a", { transcript_status: "done", transcript: "你好" }), src: "r2://a" },
  ];
  expect(voiceNotes(saved, new Map())).toEqual([
    {
      id: "a",
      src: "r2://a",
      durationMs: 3000,
      transcription: { status: "done", transcript: "你好" },
    },
  ]);
});

test("shows a voice note recorded just now before it is saved", () => {
  const local = new Map<string, LocalVoiceNote>([
    ["b", { src: "blob:b", durationMs: 1200, transcription: "running" }],
  ]);
  expect(voiceNotes([], local)).toEqual([
    { id: "b", src: "blob:b", durationMs: 1200, transcription: "running" },
  ]);
});

test("prefers the local audio and the editor's transcription over stale page data", () => {
  const saved = [{ recording: recording("b"), src: "r2://b" }];
  const local = new Map<string, LocalVoiceNote>([
    ["b", { src: "blob:b", transcription: { status: "done", transcript: "早安" } }],
  ]);
  expect(voiceNotes(saved, local)).toEqual([
    {
      id: "b",
      src: "blob:b",
      durationMs: 3000,
      transcription: { status: "done", transcript: "早安" },
    },
  ]);
});

test("falls back to the saved state once the editor's transcription is dropped", () => {
  const saved = [{ recording: recording("b"), src: "r2://b" }];
  const local = new Map<string, LocalVoiceNote>([["b", { src: "blob:b" }]]);
  expect(voiceNotes(saved, local)[0].transcription).toEqual({
    status: "pending",
    transcript: null,
  });
});

test("leaves out a local voice note that was never saved or is gone", () => {
  const local = new Map<string, LocalVoiceNote>([
    ["unsaved", { src: "blob:unsaved" }],
    ["retried", { transcription: { status: "done", transcript: "嗨" } }],
  ]);
  expect(voiceNotes([], local)).toEqual([]);
});
