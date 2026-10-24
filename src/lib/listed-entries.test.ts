import { expect, test, vi } from "vitest";
import { addBodies, listedEntry, rememberListed, requestBodies } from "./listed-entries";

test("fetches only the bodies it lacks, once each", async () => {
  rememberListed(
    [{ id: "b", entry_date: "2026-10-23", tags: [], recordings: [] }],
    [{ id: "a", body: "已經有了" }],
  );
  let resolve!: (response: Response) => void;
  const fetch = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
  vi.stubGlobal("fetch", fetch);

  requestBodies(["a", "b", "c"]);
  requestBodies(["b", "c"]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith("/entries/bodies?ids=b,c");

  resolve(Response.json([{ id: "b", body: "海邊" }]));
  await vi.waitFor(() => expect(listedEntry("b")?.body).toBe("海邊"));
  vi.unstubAllGlobals();
});

test("ignores a fetch that finishes after a fresh list replaced its own", async () => {
  rememberListed([{ id: "a", entry_date: "2026-10-23", tags: [], recordings: [] }], []);
  let resolve!: (response: Response) => void;
  vi.stubGlobal("fetch", () => new Promise<Response>((r) => (resolve = r)));
  requestBodies(["a"]);
  rememberListed([{ id: "a", entry_date: "2026-10-23", tags: [], recordings: [] }], []);
  resolve(Response.json([{ id: "a", body: "舊的" }]));
  await new Promise((r) => setTimeout(r));
  expect(listedEntry("a")).toBeUndefined();
  vi.unstubAllGlobals();
});

test("drops bodies fetched for an earlier list, which may have changed", () => {
  rememberListed([{ id: "a", entry_date: "2026-10-23", tags: [], recordings: [] }], []);
  addBodies([{ id: "a", body: "舊的" }]);
  rememberListed([{ id: "a", entry_date: "2026-10-23", tags: [], recordings: [] }], []);
  expect(listedEntry("a")).toBeUndefined();
});
