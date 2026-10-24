"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLinesIcon, SquareIcon } from "lucide-react";
import {
  createRecordingUpload,
  saveRecording,
  transcribeRecording,
} from "@/app/(journal)/entries/actions";
import { MAX_RECORDING_MS, RECORDING_MIME_TYPES } from "@/lib/audio";
import { formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useVoiceNotes } from "./voice-notes-context";

export function VoiceRecorder({ entryId, entryDate }: { entryId: string; entryDate: string }) {
  const { transcribe } = useVoiceNotes();
  const [status, setStatus] = useState<"idle" | "recording">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (status !== "recording") return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(ms);
      if (ms >= MAX_RECORDING_MS) recorderRef.current?.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [status]);

  // Release the microphone if the user navigates away mid-recording.
  useEffect(() => () => recorderRef.current?.stream.getTracks().forEach((t) => t.stop()), []);

  async function start() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was denied. Allow it in your browser settings to record.");
      return;
    }

    const mimeType = RECORDING_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    let startedAt = 0;

    recorder.onstart = (event) => (startedAt = event.timeStamp);
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = (event) => {
      stream.getTracks().forEach((track) => track.stop());
      setStatus("idle");
      void upload(new Blob(chunks, { type: recorder.mimeType }), event.timeStamp - startedAt);
    };

    recorderRef.current = recorder;
    recorder.start();
    setElapsed(0);
    setStatus("recording");
  }

  // The voice note shows up the moment recording stops, playing from the local
  // audio, while it uploads, saves and is transcribed in the background.
  async function upload(audio: Blob, durationMs: number) {
    const id = crypto.randomUUID();
    try {
      await transcribe(
        id,
        async () => {
          const target = await createRecordingUpload(entryId, entryDate, audio.type);
          if ("error" in target) throw new Error(target.error);

          const response = await fetch(target.url, {
            method: "PUT",
            body: audio,
            headers: { "Content-Type": audio.type },
          });
          if (!response.ok) throw new Error(`Upload failed (${response.status})`);

          const saved = await saveRecording({
            id,
            entryId,
            key: target.key,
            mimeType: audio.type,
            durationMs,
          });
          if (saved.error) throw new Error(saved.error);
          return transcribeRecording(id);
        },
        { audio, durationMs },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the recording");
    }
  }

  return (
    <div className="relative flex flex-wrap items-center justify-center gap-1 md:flex-nowrap">
      {status === "recording" ? (
        <>
          <Button
            variant="destructive"
            size="sm"
            className="h-12 rounded-full max-md:glass md:h-7"
            onClick={() => recorderRef.current?.stop()}
          >
            <SquareIcon data-icon="inline-start" />
            Stop
          </Button>
          <span className="flex items-center gap-2 px-2 text-sm tabular-nums" aria-live="polite">
            <span className="size-2 animate-pulse rounded-full bg-destructive" />
            {formatDuration(elapsed)}
          </span>
        </>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-12 rounded-full max-md:glass md:h-7"
          onClick={start}
        >
          <AudioLinesIcon data-icon="inline-start" className="text-primary" />
          Record
        </Button>
      )}
      {error && (
        <p className="absolute top-full left-1/2 mt-3 w-72 -translate-x-1/2 rounded-xl bg-popover px-3 py-2 text-center text-sm text-destructive shadow-lg">
          {error}
        </p>
      )}
    </div>
  );
}
