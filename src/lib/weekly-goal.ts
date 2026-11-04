import { addDays, format, parseISO, startOfWeek } from "date-fns";

// Days a week to write, as Day One's journaling goal.
export const WEEKLY_GOAL = 5;

// This week's progress toward the goal, from the days that have entries
// ("2026-11-04"). The week runs Monday to Sunday and starts over every Monday.
export function weeklyGoal(dates: Iterable<string>, today: string) {
  const days = new Set(dates);
  const monday = startOfWeek(parseISO(today), { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(monday, i), "yyyy-MM-dd");
    const future = date > today;
    return { date, written: !future && days.has(date), isToday: date === today, future };
  });
  return { week, written: week.filter((day) => day.written).length, goal: WEEKLY_GOAL };
}

export type WeeklyGoal = ReturnType<typeof weeklyGoal>;
