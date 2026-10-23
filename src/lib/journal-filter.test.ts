import { expect, test } from "vitest";
import { filterEntries, filterHref, readFilter } from "./journal-filter";

const entries = [
  { id: "a", entry_date: "2026-10-22", tags: ["夢"], recordings: [] },
  { id: "b", entry_date: "2026-10-22", tags: ["日記"], recordings: [{}] },
  { id: "c", entry_date: "2026-10-21", tags: ["日記", "夢"], recordings: [] },
];
const ids = (list: { id: string }[]) => list.map((entry) => entry.id);

test("reads the filter from the list's URL", () => {
  expect(readFilter(new URLSearchParams("tag=%E5%A4%A2&day=2026-10-22"))).toEqual({
    tag: "夢",
    voice: false,
    day: "2026-10-22",
    q: undefined,
  });
  expect(readFilter(new URLSearchParams("filter=voice&day=yesterday&q=%E6%B5%B7"))).toEqual({
    tag: undefined,
    voice: true,
    day: undefined,
    q: "海",
  });
});

test("writes the URL back, with a tag taking the voice filter's place", () => {
  expect(filterHref({ voice: false })).toBe("/");
  expect(filterHref({ voice: true, day: "2026-10-22" })).toBe("/?filter=voice&day=2026-10-22");
  expect(filterHref({ tag: "夢", voice: true })).toBe("/?tag=%E5%A4%A2");
  expect(filterHref({ voice: false, q: "海" })).toBe("/?q=%E6%B5%B7");
});

test("filters by tag, voice notes and day", () => {
  expect(ids(filterEntries(entries, { voice: false }))).toEqual(["a", "b", "c"]);
  expect(ids(filterEntries(entries, { tag: "夢", voice: false }))).toEqual(["a", "c"]);
  expect(ids(filterEntries(entries, { voice: true }))).toEqual(["b"]);
  expect(ids(filterEntries(entries, { tag: "夢", voice: false, day: "2026-10-22" }))).toEqual([
    "a",
  ]);
});
