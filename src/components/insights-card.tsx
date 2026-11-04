import { cn } from "cn";
import type { WeeklyGoal } from "@/lib/weekly-goal";
import type { JournalStats } from "@/lib/stats";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function InsightsCard({ stats, goal }: { stats: JournalStats; goal: WeeklyGoal }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-insights p-3.5 text-white">
      <p className="text-sm font-semibold">Insights</p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-5xl leading-none font-bold tracking-tight tabular-nums">
            {stats.daysJournaled}
          </p>
          <p className="mt-1 text-xs">
            Days <span className="text-white/70">Journaled</span>
          </p>
        </div>
        <dl className="flex flex-col items-end">
          <dt className="sr-only">Minutes spoken</dt>
          <dd className="text-4xl leading-none font-bold tracking-tight tabular-nums">
            {stats.minutesSpoken}
          </dd>
          <dd className="mt-1 text-xs">
            Minutes <span className="text-white/70">Spoken</span>
          </dd>
        </dl>
      </div>
      <WeekGoal goal={goal} />
    </div>
  );
}

// This week's days, Monday first, filled where there's an entry, like a
// weekly goal's rings; the week starts over every Monday.
function WeekGoal({ goal }: { goal: WeeklyGoal }) {
  const met = goal.written >= goal.goal;
  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-white/20 pt-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-white/70">Weekly Goal</p>
        {met ? (
          <p className="font-semibold">Goal Met 🎉</p>
        ) : (
          <p className="text-white/70">
            <span className="font-semibold text-white tabular-nums">{goal.written}</span> of{" "}
            <span className="tabular-nums">{goal.goal}</span> days
          </p>
        )}
      </div>
      <ol className="flex justify-between" aria-label="This week">
        {goal.week.map((day, i) => (
          <li
            key={day.date}
            aria-label={`${day.date}${day.written ? ", written" : ""}`}
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-[10px] font-semibold",
              day.written ? "bg-white text-(--insights-from)" : "bg-white/15 text-white/80",
              day.isToday && !day.written && "ring-1 ring-white/70",
              day.future && "bg-white/5 text-white/40",
            )}
          >
            <span aria-hidden>{WEEKDAYS[i]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
