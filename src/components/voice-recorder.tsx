"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLinesIcon, MicIcon, PauseIcon, SquareIcon } from "lucide-react";
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

// A press this short is a tap: recording starts, or stops pausing, and runs
// until the next tap. Held longer, the button records until it is let go.
const TAP_MS = 300;
// Shorter stretches have nothing worth transcribing.
const MIN_PART_MS = 500;

// iOS handles audio like a phone call while the microphone is open, and only
// switches back when something next plays, so that first play of the new voice
// note runs silent. Naming the session's type switches it right away. Only
// Safari has the Audio Session API, and TypeScript doesn't describe it yet.
function setAudioSession(type: "play-and-record" | "playback") {
  const { audioSession } = navigator as Navigator & { audioSession?: { type: string } };
  if (audioSession) audioSession.type = type;
}

function releaseMicrophone(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
  setAudioSession("playback");
}

// iOS sometimes never answers a request for a microphone it already allowed,
// most often in the home-screen app. Waiting on it would leave the button dead
// until a reload, so give up and let the next press ask again. The first
// request waits without a limit, since the user may be reading the permission
// prompt.
const OPEN_TIMEOUT_MS = 5000;

class MicrophoneTimeout extends Error {}

async function openMicrophone() {
  const permission = await navigator.permissions
    ?.query({ name: "microphone" as PermissionName })
    .then(
      (status) => status.state,
      () => undefined,
    );
  const request = navigator.mediaDevices.getUserMedia({ audio: true });
  if (permission !== "granted") return request;
  return new Promise<MediaStream>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new MicrophoneTimeout());
      // Answered after all: close it, since nothing is recording anymore.
      request.then(
        (stream) => stream.getTracks().forEach((track) => track.stop()),
        () => {},
      );
    }, OPEN_TIMEOUT_MS);
    request.then(
      (stream) => {
        clearTimeout(timer);
        resolve(stream);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

type Part = { status: "running" } | { status: "done"; text: string } | { status: "failed" };

// One recorder runs for the whole voice note and pauses with each pause, so it
// ends as a single file. Each stretch between pauses also gets a recorder of
// its own: a part of a recording isn't a playable file without the header at
// its start, so each stretch has to be its own file to be transcribed on pause.
type Session = {
  stream: MediaStream;
  options: MediaRecorderOptions | undefined;
  recorder: MediaRecorder;
  chunks: Blob[];
  stretch: { recorder: MediaRecorder; chunks: Blob[]; startedAt: number } | null;
  // Started with a tap, so letting go of the button doesn't pause it.
  tapped: boolean;
  // Audio recorded before the current stretch.
  recordedMs: number;
  // Each part's text in order, or null if it couldn't be transcribed.
  texts: Promise<string | null>[];
};

export function VoiceRecorder({ entryId, entryDate }: { entryId: string; entryDate: string }) {
  const { transcribe } = useVoiceNotes();
  // "holding" while the button is down, "recording" after a tap.
  const [status, setStatus] = useState<"idle" | "opening" | "holding" | "recording" | "paused">(
    "idle",
  );
  const [elapsed, setElapsed] = useState(0);
  const [parts, setParts] = useState<readonly Part[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  // Whether the button is down, which can change while the microphone opens.
  const heldRef = useRef(false);
  const pressedAtRef = useRef(0);
  const openingRef = useRef(false);

  useEffect(() => {
    if (status !== "holding" && status !== "recording") return;
    const timer = setInterval(() => {
      const session = sessionRef.current;
      if (!session?.stretch) return;
      const ms = session.recordedMs + performance.now() - session.stretch.startedAt;
      setElapsed(ms);
      if (ms >= MAX_RECORDING_MS) void finish();
    }, 250);
    return () => clearInterval(timer);
    // oxlint-disable-next-line react/exhaustive-deps -- finish only reads refs
  }, [status]);

  // Release the microphone if the user navigates away mid-recording.
  useEffect(
    () => () => {
      if (sessionRef.current) releaseMicrophone(sessionRef.current.stream);
    },
    [],
  );

  async function press() {
    heldRef.current = true;
    pressedAtRef.current = performance.now();
    setError(null);
    const session = sessionRef.current;
    if (session) {
      // Pressed while recording after a tap: letting go pauses it.
      if (session.stretch) return;
      session.recorder.resume();
      startStretch(session);
      return;
    }
    if (openingRef.current) return;

    openingRef.current = true;
    setStatus("opening");
    let stream: MediaStream;
    try {
      setAudioSession("play-and-record");
      stream = await openMicrophone();
    } catch (e) {
      setAudioSession("playback");
      setStatus("idle");
      setError(
        e instanceof MicrophoneTimeout
          ? "The microphone didn't open. Try again."
          : "Microphone access was denied. Allow it in your browser settings to record.",
      );
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
      stretch: null,
      tapped: false,
      recordedMs: 0,
      texts: [],
    };
    recorder.ondataavailable = (event) => next.chunks.push(event.data);
    recorder.start();
    sessionRef.current = next;
    setParts([]);
    setElapsed(0);
    startStretch(next);
    // Let go while the browser asked for the microphone, which reads as a tap.
    if (!heldRef.current) lock(next);
  }

  function startStretch(session: Session) {
    const recorder = new MediaRecorder(session.stream, session.options);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.start();
    session.stretch = { recorder, chunks, startedAt: performance.now() };
    setStatus("holding");
  }

  function lock(session: Session) {
    session.tapped = true;
    setStatus("recording");
  }

  function release() {
    if (!heldRef.current) return;
    heldRef.current = false;
    const session = sessionRef.current;
    if (!session?.stretch) return;
    if (!session.tapped && performance.now() - pressedAtRef.current < TAP_MS) return lock(session);
    pause(session);
  }

  function pause(session: Session) {
    const stretch = session.stretch!;
    session.stretch = null;
    session.tapped = false;
    session.recorder.pause();
    const ms = performance.now() - stretch.startedAt;
    session.recordedMs += ms;
    setElapsed(session.recordedMs);
    setStatus("paused");

    const audio = new Promise<Blob>((resolve) => {
      stretch.recorder.onstop = () =>
        resolve(new Blob(stretch.chunks, { type: stretch.recorder.mimeType }));
    });
    stretch.recorder.stop();
    if (ms < MIN_PART_MS) {
      // Stopped before anything could be said: as if it never started.
      if (session.texts.length === 0) cancel();
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

  function cancel() {
    if (sessionRef.current) releaseMicrophone(sessionRef.current.stream);
    sessionRef.current = null;
    setStatus("idle");
    setParts([]);
  }

  async function finish() {
    const first = sessionRef.current;
    if (first?.stretch) pause(first);
    // Pausing drops a recording too short to keep.
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    setStatus("idle");
    setParts([]);

    const audio = await new Promise<Blob>((resolve) => {
      session.recorder.onstop = () =>
        resolve(new Blob(session.chunks, { type: session.recorder.mimeType }));
      session.recorder.stop();
    });
    releaseMicrophone(session.stream);
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
      setError(e instanceof Error ? e.message : "Could not save the recording");
    }
  }

  const recording = status === "holding" || status === "recording";
  const said = joinTranscripts(parts.map((part) => (part.status === "done" ? part.text : "")));
  const transcribing = parts.some((part) => part.status === "running");
  const failed = parts.some((part) => part.status === "failed");

  return (
    <div className="relative flex items-center justify-center gap-1">
      <Button
        variant={recording ? "destructive" : "default"}
        size="sm"
        aria-busy={status === "opening" || undefined}
        aria-label={
          status === "holding"
            ? "Recording"
            : status === "recording"
              ? "Pause recording"
              : status === "paused"
                ? "Continue recording"
                : undefined
        }
        title={recording ? undefined : "Tap to record, or hold and let go to pause"}
        className={cn(
          "h-12 touch-none rounded-full px-4 tabular-nums select-none [-webkit-touch-callout:none] has-data-[icon=inline-start]:pl-3.5 md:h-9",
          recording ? "bg-destructive text-white hover:bg-destructive" : "active:scale-95",
          status === "opening" && "animate-pulse motion-reduce:animate-none",
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
        {status === "idle" || status === "opening" ? (
          <>
            <AudioLinesIcon data-icon="inline-start" />
            Record
          </>
        ) : status === "holding" ? (
          <>
            {/* In an icon's slot, so the button keeps its size as the icon swaps. */}
            <span data-icon="inline-start" className="flex size-4 items-center justify-center">
              <span className="size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none" />
            </span>
            {formatDuration(elapsed)}
          </>
        ) : status === "recording" ? (
          <>
            <PauseIcon data-icon="inline-start" className="fill-current" />
            {formatDuration(elapsed)}
          </>
        ) : (
          <>
            <MicIcon data-icon="inline-start" />
            {formatDuration(elapsed)}
          </>
        )}
      </Button>
      {/* Shown from the first press on, so the bar doesn't resize mid-recording. */}
      {status !== "idle" && status !== "opening" && (
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Finish recording"
          title="Finish recording"
          className="size-12 rounded-full text-destructive md:size-9"
          onClick={() => void finish()}
        >
          <SquareIcon className="fill-current" />
        </Button>
      )}
      {(error || parts.length > 0) && (
        <div className="absolute bottom-full left-1/2 mb-4 flex w-80 max-w-[calc(100vw-2.5rem)] -translate-x-1/2 flex-col gap-2">
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
          {error && (
            <p className="rounded-xl bg-popover px-3 py-2 text-center text-sm text-destructive shadow-lg">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
