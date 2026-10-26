import { AudioLinesIcon, NotebookTextIcon, TagIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDuration, formatEntryDate } from "@/lib/format";
import { splitMatches } from "@/lib/search";

export type EntryCardData = {
  id: string;
  entry_date: string;
  body: string;
  tags: string[];
  recordings: { id: string; duration_ms: number | null }[];
};

// One entry in a list, styled after Journal's entry cards. Feedback follows
// the input: a pointer gets a hover state, a finger gets a press state the
// moment it touches down, and only the keyboard gets a focus ring. In search
// results, the searched text is marked.
export function EntryCard({ entry, highlight }: { entry: EntryCardData; highlight?: string }) {
  const excerpt = entry.body.trim();
  const voiceMs = entry.recordings.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0);
  return (
    <Link
      to="/entries/$id"
      params={{ id: entry.id }}
      className="block overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_3px_rgb(0_0_0/0.05)] transition-[scale,border-color,background-color] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none pointer-coarse:active:scale-[0.98] pointer-coarse:active:bg-muted pointer-fine:hover:border-border"
    >
      {entry.recordings.length > 0 && (
        <div className="m-1.5 mb-0 flex items-center gap-3 rounded-lg bg-primary/10 px-4 py-3.5">
          <AudioLinesIcon className="size-6 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-primary">
              {entry.recordings.length === 1
                ? "Voice Note"
                : `${entry.recordings.length} Voice Notes`}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatDuration(voiceMs)}</p>
          </div>
        </div>
      )}
      <div className="px-4 pt-3 pb-3.5">
        {excerpt ? (
          <p className="line-clamp-6 text-[15px] leading-normal whitespace-pre-line">
            {highlight
              ? splitMatches(excerpt, highlight).map((part, i) =>
                  i % 2 ? (
                    <mark key={i} className="rounded-sm bg-primary/20 text-inherit">
                      {part}
                    </mark>
                  ) : (
                    part
                  ),
                )
              : excerpt}
          </p>
        ) : (
          <p className="text-[15px] text-muted-foreground">Empty entry</p>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground">
        <span className="flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary">
          <NotebookTextIcon className="size-2.5" aria-hidden />
        </span>
        {formatEntryDate(entry.entry_date, { weekday: "short", month: "short", day: "numeric" })}
        {entry.tags.length > 0 && (
          <ul
            aria-label="Tags"
            className="flex min-w-0 items-center gap-2 overflow-hidden text-primary"
          >
            {entry.tags.map((t) => (
              <li key={t} className="flex shrink-0 items-center gap-0.5">
                <TagIcon className="size-3" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
