import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { journalQuery, searchQuery } from "@/lib/queries";
import { useEntryNeighbors } from "./use-entry-neighbors";

vi.mock("@tanstack/react-router", () => import("@/test/router"));
vi.mock("@/server/entries", () => ({}));
vi.mock("@/server/journal", () => ({}));
vi.mock("./use-today", () => ({ useToday: () => "2026-10-29" }));

const entry = (id: string, entry_date: string, tags: string[] = []) => ({
  id,
  entry_date,
  tags,
  recordings: [],
});

// The journal, newest first, with today's date in three earlier years.
const entries = [
  entry("today", "2026-10-29"),
  entry("2025", "2025-10-29", ["旅行"]),
  entry("2025-before", "2025-10-28", ["旅行"]),
  entry("2023", "2023-10-29"),
  entry("2022", "2022-10-29", ["旅行"]),
];

function neighbors(id: string, url: string) {
  window.history.replaceState(null, "", url);
  const client = new QueryClient();
  client.setQueryData(journalQuery.queryKey, { entries } as never);
  client.setQueryData(searchQuery("海").queryKey, {
    q: "海",
    excerpts: new Map([
      ["2025-before", ""],
      ["2022", ""],
    ]),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useEntryNeighbors(id), { wrapper }).result.current;
}

afterEach(cleanup);

test("steps through the whole journal by default", () => {
  expect(neighbors("2025", "/entries/2025")).toEqual({
    newer: "today",
    older: "2025-before",
    position: { number: 2, count: 5 },
  });
});

test("opened from On This Day, steps through today's date in earlier years", () => {
  expect(neighbors("2023", "/entries/2023?filter=on-this-day")).toEqual({
    newer: "2025",
    older: "2022",
    position: { number: 2, count: 3 },
  });
});

test("opened from a tag, steps through that tag", () => {
  expect(neighbors("2025-before", "/entries/2025-before?tag=旅行")).toEqual({
    newer: "2025",
    older: "2022",
    position: { number: 2, count: 3 },
  });
});

test("opened from a search, steps through its results", () => {
  expect(neighbors("2022", "/entries/2022?q=海")).toEqual({
    newer: "2025-before",
    older: undefined,
    position: { number: 2, count: 2 },
  });
});

test("an entry outside the list has no neighbors or place", () => {
  expect(neighbors("today", "/entries/today?filter=on-this-day")).toEqual({
    newer: undefined,
    older: undefined,
    position: undefined,
  });
});
