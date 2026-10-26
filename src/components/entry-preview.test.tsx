import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { bodyQuery } from "@/lib/entry-bodies";
import { rememberListed } from "@/lib/listed-entries";
import { entryQuery } from "@/lib/queries";
import { EntryPreview } from "./entry-preview";

vi.mock("@tanstack/react-router", () => import("@/test/router"));
vi.mock("@/server/entries", () => ({}));
vi.mock("@/server/journal", () => ({}));

const entry = { id: "a", entry_date: "2026-10-23", tags: ["旅行"], recordings: [] };

function show(client = new QueryClient()) {
  return render(
    <QueryClientProvider client={client}>
      <EntryPreview id="a" fallback={<p>Loading</p>} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  rememberListed([]);
});

test("shows what the list knew, read-only", () => {
  rememberListed([{ ...entry, recordings: [{ id: "r", duration_ms: 5000 }] }]);
  const client = new QueryClient();
  client.setQueryData(bodyQuery("a").queryKey, "今天去海邊");
  show(client);
  expect(screen.getByText("今天去海邊").closest("[inert]")).not.toBeNull();
  expect(screen.queryByRole("textbox", { name: "Entry", hidden: true })).toBeNull();
  expect(screen.getByText("旅行")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Back to journal" }).closest("[inert]")).toBeNull();
  expect(screen.queryByText("Loading")).toBeNull();
});

test("falls back for an entry the list didn't show", () => {
  show();
  expect(screen.getByText("Loading")).toBeTruthy();
});

test("falls back while the entry's text hasn't been fetched", () => {
  rememberListed([entry]);
  show();
  expect(screen.getByText("Loading")).toBeTruthy();
});

test("shows a loaded entry whole, voice notes and all", () => {
  const client = new QueryClient();
  client.setQueryData(entryQuery("a").queryKey, {
    entry: {
      ...entry,
      body: "今天去海邊",
      user_id: "u",
      created_at: "2026-10-23T09:00:00Z",
      updated_at: "2026-10-23T09:00:00Z",
    },
    tagSuggestions: [],
    recordings: [
      {
        recording: {
          id: "r",
          entry_id: "a",
          user_id: "u",
          object_key: "r.webm",
          mime_type: "audio/webm",
          duration_ms: 5000,
          transcript: "浪很大",
          transcript_status: "done" as const,
          created_at: "2026-10-23T09:00:00Z",
        },
        src: "https://example.com/r.webm",
      },
    ],
  });
  show(client);
  expect(screen.getByText("今天去海邊").closest("[inert]")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Transcript", hidden: true })).toBeTruthy();
  expect(screen.queryByText("Loading")).toBeNull();
});
