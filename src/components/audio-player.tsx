import { useQuery } from "@tanstack/react-query";
import { PauseIcon, PlayIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WAVEFORM_PEAKS, peaks, waveformQuery } from "@/lib/waveform";
import { Button } from "@/components/ui/button";

// Arrow keys move the playhead this far.
const STEP_SECONDS = 5;

// A waveform bar and the space after it, in pixels: 2px bars 2px apart, as many
// as the row fits, like iMessage's and WhatsApp's voice notes.
const BAR_PITCH = 4;

// A voice note's player, laid out like Journal's: play button, time and
// `children` on top, the waveform underneath. The waveform is the seek bar:
// drag along it, or tap, to move the playhead.
export function AudioPlayer({
  recordingId,
  src,
  durationMs,
  children,
}: {
  recordingId: string;
  src: string;
  durationMs: number | null;
  children?: ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  // The file's own length once it is known, since playback runs to it. The
  // recorded length stands in until then, and for MediaRecorder WebM files,
  // which often report an Infinity duration.
  const [duration, setDuration] = useState((durationMs ?? 0) / 1000);
  const readDuration = (audio: HTMLAudioElement) => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
  };
  // Flat until decoded, and flat for good if the browser can't decode it:
  // the bars still seek.
  const { data: decoded } = useQuery(waveformQuery(recordingId, src));
  const waveformRef = useRef<HTMLDivElement>(null);
  const [bars, setBars] = useState(0);
  useEffect(() => {
    const waveform = waveformRef.current;
    if (!waveform) return;
    const observer = new ResizeObserver(([entry]) => {
      const fit = Math.floor((entry.contentRect.width + BAR_PITCH / 2) / BAR_PITCH);
      setBars(Math.min(fit, WAVEFORM_PEAKS));
    });
    observer.observe(waveform);
    return () => observer.disconnect();
  }, []);
  const heights = decoded && bars > 0 ? peaks(decoded, bars) : undefined;
  const progress = duration > 0 ? Math.min(time / duration, 1) : 0;

  function seek(seconds: number) {
    const next = Math.min(Math.max(seconds, 0), duration);
    if (audioRef.current) audioRef.current.currentTime = next;
    setTime(next);
  }

  function seekToPointer(event: React.PointerEvent<HTMLElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width > 0) seek(((event.clientX - box.left) / box.width) * duration);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- the transcript shown with the player is the text alternative */}
      <audio
        ref={audioRef}
        src={src}
        // The waveform fetches the same URL with CORS. R2 sends no Vary:
        // Origin, so a copy cached from a plain request would fail that fetch.
        crossOrigin="anonymous"
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => readDuration(event.currentTarget)}
        onDurationChange={(event) => readDuration(event.currentTarget)}
      />
      <div className="flex items-center gap-2">
        <Button
          size="icon-lg"
          className="rounded-full"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => {
            const audio = audioRef.current;
            if (!audio) return;
            if (audio.paused) void audio.play();
            else audio.pause();
          }}
        >
          {playing ? <PauseIcon className="fill-current" /> : <PlayIcon className="fill-current" />}
        </Button>
        {/* The length at rest; where playback is once it has moved. */}
        <span className="ml-1 text-sm text-muted-foreground tabular-nums">
          {formatDuration((playing || time > 0 ? time : duration) * 1000)}
        </span>
        {children}
      </div>
      <div
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a range input can't be drawn as a waveform, and laid transparently over one, iOS only moves it by its thumb rather than seeking where tapped
        role="slider"
        ref={waveformRef}
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${formatDuration(time * 1000)} of ${formatDuration(duration * 1000)}`}
        className="flex h-10 cursor-pointer touch-pan-y items-center justify-between rounded-md select-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          seekToPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) seekToPointer(event);
        }}
        onKeyDown={(event) => {
          const to = {
            ArrowLeft: time - STEP_SECONDS,
            ArrowDown: time - STEP_SECONDS,
            ArrowRight: time + STEP_SECONDS,
            ArrowUp: time + STEP_SECONDS,
            Home: 0,
            End: duration,
          }[event.key];
          if (to === undefined) return;
          event.preventDefault();
          seek(to);
        }}
      >
        {Array.from({ length: bars }, (_, i) => (
          <span
            key={i}
            className={cn(
              "w-[2px] rounded-full transition-colors",
              (i + 0.5) / bars <= progress ? "bg-primary" : "bg-primary/35",
            )}
            style={{ height: `max(3px, ${(heights?.[i] ?? 0) * 100}%)` }}
          />
        ))}
      </div>
    </div>
  );
}
