import { expect, test } from "vitest";
import { formatDuration, formatEntryDate } from "./format";

test("formatDuration shows minutes and zero-padded seconds", () => {
  expect(formatDuration(0)).toBe("0:00");
  expect(formatDuration(102_400)).toBe("1:42");
  expect(formatDuration(3_605_000)).toBe("60:05");
});

test("formatEntryDate keeps the calendar date whatever the time zone", () => {
  expect(formatEntryDate("2026-10-23", { weekday: "short", month: "short", day: "numeric" })).toBe(
    "Fri, Oct 23",
  );
});
