import { cn } from "@/lib/utils";

// How many bars the waveform shows, one per loudness sample.
export const LEVELS = 64;

// Recent loudness as bars, newest on the right; quiet moments are dots.
export function Waveform({ levels, live }: { levels: readonly number[]; live: boolean }) {
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
