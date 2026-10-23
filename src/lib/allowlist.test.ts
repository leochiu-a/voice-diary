import { expect, test } from "vitest";
import { isAllowedEmail, parseEmailList } from "./allowlist";

test("parses a comma-separated list, ignoring case, spaces and empty items", () => {
  expect(parseEmailList(" Me@Gmail.com, ,other@example.com ")).toEqual([
    "me@gmail.com",
    "other@example.com",
  ]);
});

test("matches emails without regard to case", () => {
  const allowed = ["me@gmail.com"];
  expect(isAllowedEmail("ME@gmail.com", allowed)).toBe(true);
  expect(isAllowedEmail("stranger@gmail.com", allowed)).toBe(false);
  expect(isAllowedEmail(undefined, allowed)).toBe(false);
});
