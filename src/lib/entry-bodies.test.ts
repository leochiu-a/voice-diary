import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { bodyQuery } from "./entry-bodies";

afterEach(() => vi.unstubAllGlobals());

test("fetches the text of entries asked for together in one request", async () => {
  const fetch = vi.fn(async () => Response.json([{ id: "a", body: "海邊" }]));
  vi.stubGlobal("fetch", fetch);
  const client = new QueryClient();

  const a = client.fetchQuery(bodyQuery("a"));
  const b = client.fetchQuery(bodyQuery("b"));
  await expect(a).resolves.toBe("海邊");
  await expect(b).rejects.toThrow("not found");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith("/entries/bodies?ids=a,b");
});

test("uses text the server sent instead of fetching it", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const client = new QueryClient();
  await expect(client.fetchQuery(bodyQuery("a", "已經有了"))).resolves.toBe("已經有了");
  expect(fetch).not.toHaveBeenCalled();
});
