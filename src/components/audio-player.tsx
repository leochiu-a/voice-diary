"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function AudioPlayer({ src, durationMs }: { src: string; durationMs: number | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  // MediaRecorder WebM files often report an Infinity duration, so prefer the recorded one.
  const [duration, setDuration] = useState((durationMs ?? 0) / 1000);

  return (
    <div className="flex items-center gap-3">
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- the transcript shown under the player is the text alternative */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (!duration && Number.isFinite(value)) setDuration(value);
        }}
      />
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
        {playing ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Slider
        aria-label="Seek"
        value={[Math.min(time, duration)]}
        max={duration || 1}
        step={0.1}
        onValueChange={(value) => {
          const next = Array.isArray(value) ? value[0] : value;
          if (audioRef.current) audioRef.current.currentTime = next;
          setTime(next);
        }}
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDuration(time * 1000)} / {formatDuration(duration * 1000)}
      </span>
    </div>
  );
}
