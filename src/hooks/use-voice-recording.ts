import { useEffect, useRef, useState } from "react";
import {
  createRecordingUpload,
  saveRecording,
  transcribeRecording,
  transcribeSegment,
} from "@/server/entries";
import { MAX_RECORDING_MS, RECORDING_MIME_TYPES } from "@/lib/audio";
import {
  listen,
  loudness,
  MicrophoneTimeout,
  openAudioContext,
  openMicrophone,
  pausePlayback,
  releaseMicrophone,
} from "@/lib/microphone";
import { joinTranscripts } from "@/lib/voice-notes";
import { LEVELS } from "@/components/waveform";
import { useVoiceNotes } from "@/components/voice-notes-context";
import { useWakeLock } from "./use-wake-lock";

// A press this short is a tap: recording starts, or stops pausing, and runs
// until the next tap. Held longer, the button records until it is let go.
const TAP_MS = 300;
// Shorter stretches have nothing worth transcribing.
const MIN_PART_MS = 500;
// The waveform gets a loudness sample this often.
const LEVEL_MS = 70;

type Part = { status: "running" } | { status: "done"; text: string } | { status: "failed" };

// "holding" while the button is down, "recording" after a tap.
type RecordingStatus = "idle" | "opening" | "holding" | "recording" | "paused";

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

function closeSession(session: Session) {
  releaseMicrophone(session.stream);
  void session.audio?.close();
}

// Records a voice note for an entry: `press` and `release` follow the record
// button, `finish` saves the note and `cancel` discards it. Each stretch is
// transcribed when it pauses, so the text shows up while recording. `onFinish`
// runs the moment a recording is finished, by the user or by reaching the
// length limit, before it is saved.
export function useVoiceRecording({
  entryId,
  entryDate,
  onFinish,
}: {
  entryId: string;
  entryDate: string;
  onFinish: () => void;
}) {
  const { transcribe } = useVoiceNotes();
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [parts, setParts] = useState<readonly Part[]>([]);
  const [error, setError] = useState<string | null>(null);
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
    onFinish();

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

  return { status, elapsed, parts, levels, error, press, release, cancel, finish };
}
