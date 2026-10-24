import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { bodyQuery } from "@/lib/entry-bodies";
import { rememberListed } from "@/lib/listed-entries";
import { EntryPreview } from "./entry-preview";

// The entry the URL names.
const route = vi.hoisted(() => ({ id: "a" }));
vi.mock("next/navigation", () => ({
  useParams: () => route,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/app/(journal)/entries/actions", () => ({}));

const entry = { id: "a", entry_date: "2026-10-23", tags: ["旅行"], recordings: [] };

function show(client = new QueryClient()) {
  return render(
    <QueryClientProvider client={client}>
      <EntryPreview fallback={<p>Loading</p>} />
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
  const body = screen.getByRole("textbox", { name: "Entry", hidden: true });
  expect((body as HTMLTextAreaElement).value).toBe("今天去海邊");
  expect(body.closest("[inert]")).not.toBeNull();
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
