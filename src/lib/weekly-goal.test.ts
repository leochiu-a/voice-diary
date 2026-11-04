import { describe, expect, test } from "vitest";
import { weeklyGoal } from "./weekly-goal";

// 2026-11-04 is a Wednesday.
const today = "2026-11-04";

describe("weeklyGoal", () => {
  test("runs Monday to Sunday around today, counting each written day once", () => {
    const goal = weeklyGoal(["2026-11-01", "2026-11-02", "2026-11-04", "2026-11-04"], today);
    expect(goal.week.map((day) => day.date)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(goal.week.map((day) => day.written)).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(goal.written).toBe(2);
  });

  test("ignores entries dated later this week", () => {
    const goal = weeklyGoal(["2026-11-05", "2026-11-06"], today);
    expect(goal.written).toBe(0);
    expect(goal.week.map((day) => day.future)).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      true,
    ]);
  });

  test("starts on Monday when today is Sunday", () => {
    expect(weeklyGoal([], "2026-11-08").week[0].date).toBe("2026-11-02");
  });
});
