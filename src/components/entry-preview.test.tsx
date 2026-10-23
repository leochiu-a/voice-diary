import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { rememberListed } from "@/lib/listed-entries";
import { EntryPreview } from "./entry-preview";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "a" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/app/(journal)/entries/actions", () => ({}));

afterEach(() => {
  cleanup();
  rememberListed([]);
});

test("shows what the list's card knew, read-only", () => {
  rememberListed([
    {
      id: "a",
      entry_date: "2026-10-23",
      body: "今天去海邊",
      tags: ["旅行"],
      recordings: [{ id: "r", duration_ms: 5000 }],
    },
  ]);
  render(<EntryPreview fallback={<p>Loading</p>} />);
  const body = screen.getByRole("textbox", { name: "Entry", hidden: true });
  expect((body as HTMLTextAreaElement).value).toBe("今天去海邊");
  expect(body.closest("[inert]")).not.toBeNull();
  expect(screen.getByText("旅行")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Back to journal" }).closest("[inert]")).toBeNull();
  expect(screen.queryByText("Loading")).toBeNull();
});

test("falls back for an entry the list didn't show", () => {
  render(<EntryPreview fallback={<p>Loading</p>} />);
  expect(screen.getByText("Loading")).toBeTruthy();
});
