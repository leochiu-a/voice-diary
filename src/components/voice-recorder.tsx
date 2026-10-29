import { useEffect, useRef, useState } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { Popover } from "@base-ui/react/popover";
import { CheckIcon, XIcon } from "lucide-react";
import {
  createRecordingUpload,
  saveRecording,
  transcribeRecording,
  transcribeSegment,
} from "@/server/entries";
import { MAX_RECORDING_MS, RECORDING_MIME_TYPES } from "@/lib/audio";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { joinTranscripts } from "@/lib/voice-notes";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useVoiceNotes } from "./voice-notes-context";

// Matches Tailwind's `md`, where the toolbar shows its Record button.
const WIDE_QUERY = "(min-width: 48rem)";

export type RecorderPopover = Popover.Handle<unknown>;
export const createRecorderPopover = (): RecorderPopover => Popover.createHandle();

// Both Record buttons, the toolbar's and the phone's, are a glass pill with
// this dot: red like the recorder's own button, leaving purple to Done.
function RecordDot() {
  return <span aria-hidden className="size-2.5 rounded-full bg-destructive" />;
}

// The toolbar's Record button, shown on wide screens: a labeled pill, so the
// app's main action stands out from the icon buttons.
export function RecordButton({ popover }: { popover: RecorderPopover }) {
  return (
    <Popover.Trigger
      handle={popover}
      render={
        <Button
          variant="glass"
          size="sm"
          aria-label="Record a voice note"
          className="hidden h-9 gap-2 rounded-full px-3.5 md:inline-flex"
        />
      }
    >
      <RecordDot />
      Record
    </Popover.Trigger>
  );
}

// A press this short is a tap: recording starts, or stops pausing, and runs
// until the next tap. Held longer, the button records until it is let go.
const TAP_MS = 300;
// Shorter stretches have nothing worth transcribing.
const MIN_PART_MS = 500;
// The waveform keeps this many recent loudness samples, one every LEVEL_MS.
const LEVELS = 64;
const LEVEL_MS = 70;

// A voice note still playing would be recorded too, and on iOS playback
// holds the audio session the microphone needs, so recording stops it first.
function pausePlayback() {
  document.querySelectorAll("audio").forEach((audio) => audio.pause());
}

function releaseMicrophone(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

// Made inside the press, so iOS lets it run: started later, it stays suspended.
function openAudioContext() {
  if (typeof AudioContext === "undefined") return null;
  const audio = new AudioContext();
  void audio.resume();
  return audio;
}

function listen(audio: AudioContext | null, stream: MediaStream) {
  if (!audio) return null;
  const analyser = audio.createAnalyser();
  analyser.fftSize = 1024;
  audio.createMediaStreamSource(stream).connect(analyser);
  return analyser;
}

// How loud the last moment was, 0 to 1, from the samples' root mean square.
// Speech rarely goes past 0.25 RMS, so that is scaled up to fill the height.
function loudness(analyser: AnalyserNode, samples: Float32Array<ArrayBuffer>) {
  analyser.getFloatTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

function closeSession(session: Session) {
  releaseMicrophone(session.stream);
  void session.audio?.close();
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
  // Measures the microphone's loudness for the waveform. Missing where the
  // browser has no Web Audio.
  audio: AudioContext | null;
  analyser: AnalyserNode | null;
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

// On phones, a Record button opens the recorder as a sheet inside
// `sheetContainer`, centered over it. Given `popover`, wide screens open it
// instead from that handle's trigger (the toolbar's Record button), as a
// popover. Either way the recording lives here, so it survives the window
// crossing between the two.
export function VoiceRecorder({
  entryId,
  entryDate,
  sheetContainer,
  popover: handle,
}: {
  entryId: string;
  entryDate: string;
  sheetContainer?: HTMLElement | null;
  popover?: RecorderPopover;
}) {
  const wide = useMediaQuery(WIDE_QUERY);
  const popover = wide ? handle : undefined;
  const { transcribe } = useVoiceNotes();
  // "holding" while the button is down, "recording" after a tap.
  const [status, setStatus] = useState<"idle" | "opening" | "holding" | "recording" | "paused">(
    "idle",
  );
  const [elapsed, setElapsed] = useState(0);
  const [parts, setParts] = useState<readonly Part[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [levels, setLevels] = useState<readonly number[]>([]);
  const sessionRef = useRef<Session | null>(null);
  // Whether the button is down, which can change while the microphone opens.
  const heldRef = useRef(false);
  const pressedAtRef = useRef(0);
  const openingRef = useRef(false);

  // The microphone stays open while paused too, so the screen stays on until
  // the recording is finished or discarded.
  useWakeLock(status !== "idle");

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

  // The waveform moves only while recording; paused, it holds still.
  useEffect(() => {
    if (status !== "holding" && status !== "recording") return;
    const analyser = sessionRef.current?.analyser;
    if (!analyser) return;
    const samples = new Float32Array(analyser.fftSize);
    const timer = setInterval(() => {
      const level = loudness(analyser, samples);
      setLevels((current) => [...current.slice(1 - LEVELS), level]);
    }, LEVEL_MS);
    return () => clearInterval(timer);
  }, [status]);

  // Release the microphone if the user navigates away mid-recording.
  useEffect(
    () => () => {
      if (sessionRef.current) closeSession(sessionRef.current);
    },
    [],
  );

  async function press() {
    heldRef.current = true;
    pressedAtRef.current = performance.now();
    setError(null);
    pausePlayback();
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
    const audio = openAudioContext();
    let stream: MediaStream;
    try {
      stream = await openMicrophone();
    } catch (e) {
      void audio?.close();
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
      audio,
      analyser: listen(audio, stream),
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
    setLevels([]);
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
    // A part that comes back after the recording was finished or discarded
    // belongs to no list on screen anymore.
    const setPart = (part: Part) => {
      if (sessionRef.current !== session) return;
      setParts((current) => current.map((other, i) => (i === index ? part : other)));
    };
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
    const session = sessionRef.current;
    if (session) {
      session.stretch?.recorder.stop();
      session.recorder.stop();
      closeSession(session);
    }
    sessionRef.current = null;
    setStatus("idle");
    setParts([]);
    setLevels([]);
    setElapsed(0);
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
    setLevels([]);
    setOpen(false);

    const audio = await new Promise<Blob>((resolve) => {
      session.recorder.onstop = () =>
        resolve(new Blob(session.chunks, { type: session.recorder.mimeType }));
      session.recorder.stop();
    });
    closeSession(session);
    void save(audio, session.recordedMs, session.texts);
  }

  async function upload(audio: Blob) {
    const target = await createRecordingUpload({
      data: { entryId, entryDate, mimeType: audio.type },
    });
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
    const result = await transcribeSegment({
      data: { entryId, key: await upload(audio), mimeType: audio.type },
    });
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
            data: { id, entryId, key, mimeType: audio.type, durationMs, transcript },
          });
          if (saved.error) throw new Error(saved.error);
          return transcript === undefined
            ? transcribeRecording({ data: id })
            : { status: "done", transcript: transcript || null };
        },
        { audio, durationMs },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the recording");
    }
  }

  const recording = status === "holding" || status === "recording";
  const started = status !== "idle" && status !== "opening";
  const said = joinTranscripts(parts.map((part) => (part.status === "done" ? part.text : "")));
  const transcribing = parts.some((part) => part.status === "running");
  const failed = parts.some((part) => part.status === "failed");
  const errorMessage = error && (
    <p className="rounded-xl bg-popover px-3 py-2 text-center text-sm text-destructive shadow-lg">
      {error}
    </p>
  );

  const panel = (
    <>
      <p className="mt-2 text-xl text-muted-foreground tabular-nums">{formatDuration(elapsed)}</p>

      <div className="flex h-36 w-full flex-col items-center justify-center">
        {started ? (
          <Waveform levels={levels} live={recording} />
        ) : (
          <p className="text-xl font-semibold text-muted-foreground">
            Tap to record, or hold to talk
          </p>
        )}
      </div>

      {parts.length > 0 && (
        <div
          className="max-h-32 w-full overflow-y-auto text-[15px] leading-relaxed"
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
      {error && <div className="mt-3 w-full">{errorMessage}</div>}

      {/* Pressing and dragging here records; it must not swipe the sheet. */}
      <div
        data-base-ui-swipe-ignore
        className="mt-6 grid w-full grid-cols-[1fr_auto_1fr] items-center"
      >
        <div className="flex justify-start">
          {started && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Discard recording"
              title="Discard recording"
              className="size-12 rounded-full text-muted-foreground"
              onClick={cancel}
            >
              <XIcon />
            </Button>
          )}
        </div>
        <button
          type="button"
          aria-busy={status === "opening" || undefined}
          aria-label={
            status === "holding"
              ? "Recording"
              : status === "recording"
                ? "Pause recording"
                : status === "paused"
                  ? "Continue recording"
                  : "Record"
          }
          title={recording ? undefined : "Tap to record, or hold and let go to pause"}
          className="flex size-14 touch-none items-center justify-center rounded-full border-[3px] border-foreground/15 select-none [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
          {/* One shape that morphs: a dot to record, a square to pause. */}
          <span
            className={cn(
              "bg-destructive transition-all duration-300 ease-out motion-reduce:transition-none",
              status === "recording"
                ? "size-6 rounded-md"
                : status === "holding"
                  ? "size-10 rounded-full"
                  : "size-11 rounded-full",
              status === "opening" && "animate-pulse motion-reduce:animate-none",
            )}
          />
        </button>
        <div className="flex justify-end">
          {status === "paused" && (
            <Button
              size="icon-lg"
              aria-label="Finish recording"
              title="Finish recording"
              className="size-12 rounded-full"
              onClick={() => void finish()}
            >
              <CheckIcon />
            </Button>
          )}
        </div>
      </div>
    </>
  );

  function onOpenChange(next: boolean, details: { cancel: () => void }) {
    // A recording in progress is finished or discarded with its buttons, not
    // lost to a swipe, Esc or a click outside.
    if (!next && sessionRef.current) return details.cancel();
    setOpen(next);
  }

  // A recording that couldn't be saved reports it after the panel closed.
  const lateError = error && !open && (
    <div className="absolute bottom-full left-1/2 mb-4 w-80 max-w-[calc(100vw-2.5rem)] -translate-x-1/2">
      {errorMessage}
    </div>
  );

  // Wide screens open the panel from the toolbar's Record button, as a popover
  // under it; the page's own bottom button is for phones.
  if (popover) {
    return (
      <Popover.Root handle={popover} open={open} onOpenChange={onOpenChange}>
        <div className="relative">{lateError}</div>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="center" sideOffset={8} className="z-50">
            <Popover.Popup className="flex w-96 origin-(--transform-origin) flex-col items-center rounded-[2rem] glass bg-card/90 px-6 pt-5 pb-6 transition-[opacity,scale] duration-200 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <Popover.Title className="sr-only">Voice note</Popover.Title>
              {panel}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    // Focus stays in the sheet, but the page isn't scroll-locked: locking it
    // reserves an empty scrollbar gutter on desktop.
    <Drawer.Root modal="trap-focus" open={open} onOpenChange={onOpenChange}>
      <div className="relative">
        <Drawer.Trigger
          render={
            <Button
              variant="glass"
              size="sm"
              className={cn(
                "h-12 gap-2 rounded-full px-5 text-[15px]",
                // Hidden from the first paint, before the media query is read.
                handle && "md:hidden",
              )}
            />
          }
          aria-label="Record a voice note"
        >
          <RecordDot />
          Record
        </Drawer.Trigger>
        {lateError}
      </div>
      <Drawer.Portal container={sheetContainer}>
        <Drawer.Backdrop className="pointer-events-auto fixed inset-0 bg-black/10 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
        <Drawer.Viewport className="pointer-events-auto absolute inset-x-0 bottom-0 z-50 flex items-end justify-center px-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)] max-md:-inset-x-5">
          <Drawer.Popup className="flex w-full max-w-md [transform:translateY(var(--drawer-swipe-movement-y))] flex-col items-center rounded-[2.25rem] glass bg-card/90 px-6 pt-3 pb-8 transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(calc(100%+2rem))] data-starting-style:[transform:translateY(calc(100%+2rem))] data-swiping:select-none">
            <div className="mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            <Drawer.Title className="sr-only">Voice note</Drawer.Title>
            <Drawer.Content className="flex w-full flex-col items-center">{panel}</Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// Recent loudness as bars, newest on the right; quiet moments are dots.
function Waveform({ levels, live }: { levels: readonly number[]; live: boolean }) {
  const bars = [...Array<number>(Math.max(0, LEVELS - levels.length)).fill(0), ...levels];
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-16 w-full items-center justify-between transition-colors",
        live ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {bars.map((level, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-current"
          style={{ height: `max(3px, ${level * 100}%)` }}
        />
      ))}
    </div>
  );
}
