"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLinesIcon, MicIcon, SquareIcon } from "lucide-react";
import {
  createRecordingUpload,
  saveRecording,
  transcribeRecording,
  transcribeSegment,
} from "@/app/(journal)/entries/actions";
import { MAX_RECORDING_MS, RECORDING_MIME_TYPES } from "@/lib/audio";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { joinTranscripts } from "@/lib/voice-notes";
import { Button } from "@/components/ui/button";
import { useVoiceNotes } from "./voice-notes-context";

// Shorter holds are taps: they add no part of their own to transcribe.
const MIN_PART_MS = 500;

type Part = { status: "running" } | { status: "done"; text: string } | { status: "failed" };

// One recorder runs for the whole voice note and pauses whenever the button is
// let go, so it ends as a single file. Each hold also gets a recorder of its
// own: a part of a recording isn't a playable file without the header at its
// start, so each hold has to be its own file to be transcribed on release.
type Session = {
  stream: MediaStream;
  options: MediaRecorderOptions | undefined;
  recorder: MediaRecorder;
  chunks: Blob[];
  hold: { recorder: MediaRecorder; chunks: Blob[]; startedAt: number } | null;
  // Audio recorded before the current hold.
  recordedMs: number;
  // Each part's text in order, or null if it couldn't be transcribed.
  texts: Promise<string | null>[];
};

export function VoiceRecorder({ entryId, entryDate }: { entryId: string; entryDate: string }) {
  const { transcribe } = useVoiceNotes();
  const [status, setStatus] = useState<"idle" | "holding" | "paused">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [parts, setParts] = useState<readonly Part[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const sessionRef = useRef<Session | null>(null);
  // Whether the button is held, which can change while the microphone opens.
  const heldRef = useRef(false);
  const openingRef = useRef(false);

  useEffect(() => {
    if (status !== "holding") return;
    const timer = setInterval(() => {
      const session = sessionRef.current;
      if (!session?.hold) return;
      const ms = session.recordedMs + performance.now() - session.hold.startedAt;
      setElapsed(ms);
      if (ms >= MAX_RECORDING_MS) {
        release();
        void finish();
      }
    }, 250);
    return () => clearInterval(timer);
    // oxlint-disable-next-line react/exhaustive-deps -- release and finish only read refs
  }, [status]);

  // Release the microphone if the user navigates away mid-recording.
  useEffect(
    () => () => sessionRef.current?.stream.getTracks().forEach((track) => track.stop()),
    [],
  );

  async function press() {
    heldRef.current = true;
    setMessage(null);
    const session = sessionRef.current;
    if (session) {
      if (session.hold) return;
      session.recorder.resume();
      startHold(session);
      return;
    }
    if (openingRef.current) return;

    openingRef.current = true;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMessage({
        text: "Microphone access was denied. Allow it in your browser settings to record.",
        error: true,
      });
      return;
    } finally {
      openingRef.current = false;
    }

    const mimeType = RECORDING_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const options = mimeType ? { mimeType } : undefined;
    const recorder = new MediaRecorder(stream, options);
    const next: Session = {
      stream,
      options,
      recorder,
      chunks: [],
      hold: null,
      recordedMs: 0,
      texts: [],
    };
    recorder.ondataavailable = (event) => next.chunks.push(event.data);
    recorder.start();
    sessionRef.current = next;
    setParts([]);
    setElapsed(0);
    // Let go while the browser asked for the microphone: nothing was recorded.
    if (!heldRef.current) return cancel(true);
    startHold(next);
  }

  function startHold(session: Session) {
    const recorder = new MediaRecorder(session.stream, session.options);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.start();
    session.hold = { recorder, chunks, startedAt: performance.now() };
    setStatus("holding");
  }

  function release() {
    heldRef.current = false;
    const session = sessionRef.current;
    const hold = session?.hold;
    if (!session || !hold) return;

    session.hold = null;
    session.recorder.pause();
    const ms = performance.now() - hold.startedAt;
    session.recordedMs += ms;
    setElapsed(session.recordedMs);
    setStatus("paused");

    const audio = new Promise<Blob>((resolve) => {
      hold.recorder.onstop = () => resolve(new Blob(hold.chunks, { type: hold.recorder.mimeType }));
    });
    hold.recorder.stop();
    if (ms < MIN_PART_MS) {
      // A tap before anything was said: show how the button works instead.
      if (session.texts.length === 0) cancel(true);
      return;
    }

    const index = session.texts.length;
    setParts((current) => [...current, { status: "running" }]);
    const setPart = (part: Part) =>
      setParts((current) => current.map((other, i) => (i === index ? part : other)));
    session.texts.push(
      audio.then(transcribePart).then(
        (text) => {
          setPart({ status: "done", text });
          return text;
        },
        () => {
          setPart({ status: "failed" });
          return null;
        },
      ),
    );
  }

  function cancel(tapped: boolean) {
    sessionRef.current?.stream.getTracks().forEach((track) => track.stop());
    sessionRef.current = null;
    setStatus("idle");
    setParts([]);
    if (tapped)
      setMessage({ text: "Hold the button while you talk. Let go to pause.", error: false });
  }

  async function finish() {
    const session = sessionRef.current;
    if (!session || session.hold) return;
    sessionRef.current = null;
    setStatus("idle");
    setParts([]);

    const audio = await new Promise<Blob>((resolve) => {
      session.recorder.onstop = () =>
        resolve(new Blob(session.chunks, { type: session.recorder.mimeType }));
      session.recorder.stop();
    });
    session.stream.getTracks().forEach((track) => track.stop());
    void save(audio, session.recordedMs, session.texts);
  }

  async function upload(audio: Blob) {
    const target = await createRecordingUpload(entryId, entryDate, audio.type);
    if ("error" in target) throw new Error(target.error);
    const response = await fetch(target.url, {
      method: "PUT",
      body: audio,
      headers: { "Content-Type": audio.type },
    });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    return target.key;
  }

  async function transcribePart(audio: Blob) {
    const result = await transcribeSegment(entryId, await upload(audio), audio.type);
    if ("error" in result) throw new Error(result.error);
    return result.transcript;
  }

  // The voice note shows up the moment recording finishes, playing from the
  // local audio, while it uploads and saves in the background. Its text is the
  // parts' text joined in order; if a part failed, the whole recording is
  // transcribed again instead.
  async function save(audio: Blob, durationMs: number, texts: Promise<string | null>[]) {
    const id = crypto.randomUUID();
    try {
      await transcribe(
        id,
        async () => {
          const [key, parts] = await Promise.all([upload(audio), Promise.all(texts)]);
          const transcript = parts.every((text) => text !== null)
            ? joinTranscripts(parts)
            : undefined;
          const saved = await saveRecording({
            id,
            entryId,
            key,
            mimeType: audio.type,
            durationMs,
            transcript,
          });
          if (saved.error) throw new Error(saved.error);
          return transcript === undefined
            ? transcribeRecording(id)
            : { status: "done", transcript: transcript || null };
        },
        { audio, durationMs },
      );
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : "Could not save the recording",
        error: true,
      });
    }
  }

  const said = joinTranscripts(parts.map((part) => (part.status === "done" ? part.text : "")));
  const transcribing = parts.some((part) => part.status === "running");
  const failed = parts.some((part) => part.status === "failed");

  return (
    <div className="relative flex items-center justify-center gap-1">
      <Button
        variant={status === "holding" ? "destructive" : "ghost"}
        size="sm"
        aria-label={
          status === "idle" ? undefined : status === "holding" ? "Recording" : "Hold to continue"
        }
        className={cn(
          "h-12 touch-none rounded-full tabular-nums select-none [-webkit-touch-callout:none] md:h-7",
          status === "holding" ? "bg-destructive text-white hover:bg-destructive" : "max-md:glass",
        )}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          void press();
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          if (!event.repeat) void press();
        }}
        onKeyUp={(event) => {
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          release();
        }}
      >
        {status === "idle" ? (
          <>
            <AudioLinesIcon data-icon="inline-start" className="text-primary" />
            Hold to record
          </>
        ) : status === "holding" ? (
          <>
            <span className="size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none" />
            {formatDuration(elapsed)}
          </>
        ) : (
          <>
            <MicIcon data-icon="inline-start" className="text-primary" />
            {formatDuration(elapsed)}
          </>
        )}
      </Button>
      {status === "paused" && (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Finish recording"
          title="Finish recording"
          className="size-12 rounded-full text-destructive max-md:glass md:size-7"
          onClick={() => void finish()}
        >
          <SquareIcon className="fill-current" />
        </Button>
      )}
      {(message || parts.length > 0) && (
        <div className="absolute top-full left-1/2 mt-3 flex w-80 max-w-[calc(100vw-2.5rem)] -translate-x-1/2 flex-col gap-2">
          {parts.length > 0 && (
            <div
              className="max-h-48 overflow-y-auto rounded-2xl glass px-4 py-3 text-[15px] leading-relaxed"
              aria-live="polite"
            >
              {said}
              {transcribing && (
                <span className="animate-pulse text-muted-foreground motion-reduce:animate-none">
                  {said ? " …" : "Turning this into text…"}
                </span>
              )}
              {!said && !transcribing && !failed && (
                <span className="text-muted-foreground">No speech detected yet.</span>
              )}
              {failed && (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Part of this couldn&apos;t be turned into text. The whole recording will be
                  transcribed when you finish.
                </p>
              )}
            </div>
          )}
          {message && (
            <p
              className={cn(
                "rounded-xl bg-popover px-3 py-2 text-center text-sm shadow-lg",
                message.error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
