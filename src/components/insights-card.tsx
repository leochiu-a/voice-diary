import { MicIcon, NotebookTextIcon } from "lucide-react";
import type { JournalStats } from "@/lib/stats";

export function InsightsCard({ stats }: { stats: JournalStats }) {
  return (
    <div className="bg-insights flex flex-col gap-2 rounded-2xl p-3.5 text-white">
      <p className="text-sm font-semibold">Insights</p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-5xl leading-none font-bold tracking-tight tabular-nums">{stats.daysJournaled}</p>
          <p className="mt-1 text-xs">
            Days <span className="text-white/70">Journaled</span>
          </p>
        </div>
        <dl className="flex flex-col gap-1 text-xs">
          <div>
            <dt className="sr-only">Entries</dt>
            <dd className="flex items-center gap-1 font-semibold tabular-nums">
              <NotebookTextIcon className="size-3.5" aria-hidden />
              {stats.entries}
            </dd>
            <dd className="text-white/70">Entries</dd>
          </div>
          <div>
            <dt className="sr-only">Minutes spoken</dt>
            <dd className="flex items-center gap-1 font-semibold tabular-nums">
              <MicIcon className="size-3.5" aria-hidden />
              {stats.minutesSpoken}
            </dd>
            <dd className="text-white/70">Minutes Spoken</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
