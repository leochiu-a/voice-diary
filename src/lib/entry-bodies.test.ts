import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { bodyQuery } from "./entry-bodies";

const server = vi.hoisted(() => ({ getEntryBodies: vi.fn() }));
vi.mock("@/server/entries", () => server);

afterEach(() => server.getEntryBodies.mockReset());

test("fetches the text of entries asked for together in one request", async () => {
  server.getEntryBodies.mockResolvedValue([{ id: "a", body: "海邊" }]);
  const client = new QueryClient();

  const a = client.fetchQuery(bodyQuery("a"));
  const b = client.fetchQuery(bodyQuery("b"));
  await expect(a).resolves.toBe("海邊");
  await expect(b).rejects.toThrow("not found");
  expect(server.getEntryBodies).toHaveBeenCalledTimes(1);
  expect(server.getEntryBodies).toHaveBeenCalledWith({ data: ["a", "b"] });
});

test("uses text the server sent instead of fetching it", async () => {
  const client = new QueryClient();
  await expect(client.fetchQuery(bodyQuery("a", "已經有了"))).resolves.toBe("已經有了");
  expect(server.getEntryBodies).not.toHaveBeenCalled();
});
