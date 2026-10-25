import { beforeEach, expect, test, vi } from "vitest";

// These reads bypass row-level security, so each query must filter by the
// user the session proved, never by anything else.

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: <T,>(fn: T) => fn,
}));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ userId: "user-a" })) }));

type Call = { table: string; filters: [string, unknown][] };
const calls: Call[] = [];
let rows: Record<string, unknown>[] = [];

// Stands in for supabase-js: records each query's filters and resolves with `rows`.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const call: Call = { table, filters: [] };
      calls.push(call);
      const query = {
        select: () => query,
        order: () => query,
        range: () => query,
        eq: (column: string, value: unknown) => (call.filters.push([column, value]), query),
        in: (column: string, value: unknown) => (call.filters.push([column, value]), query),
        then: (resolve: (result: { data: unknown; error: null }) => void) =>
          resolve({ data: rows, error: null }),
      };
      return query;
    },
  }),
}));

const { getFirstBodies, getJournalIndex, journalTag } = await import("./journal-data");
const { cacheTag } = await import("next/cache");

beforeEach(() => {
  calls.length = 0;
  rows = [{ id: "e1", entry_date: "2025-10-25", tags: [], recordings: [], body: "海邊" }];
});

test("the index lists only the signed-in user's entries", async () => {
  await expect(getJournalIndex()).resolves.toEqual(rows);
  expect(calls).toEqual([{ table: "entries", filters: [["user_id", "user-a"]] }]);
  expect(cacheTag).toHaveBeenCalledWith(journalTag("user-a"));
});

test("the first bodies come only from the signed-in user's entries", async () => {
  await getFirstBodies("2026-10-25");
  const bodies = calls.at(-1)!;
  expect(bodies.filters).toContainEqual(["user_id", "user-a"]);
  expect(bodies.filters).toContainEqual(["id", ["e1"]]);
  expect(calls.every((call) => call.filters.some(([column]) => column === "user_id"))).toBe(true);
});
