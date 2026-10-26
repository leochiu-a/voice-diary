import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SearchToggle } from "./search-field";

vi.mock("@tanstack/react-router", () => import("@/test/router"));

// The search screen's field, which phones search with.
async function openSearch() {
  fireEvent.click(screen.getByRole("button", { name: "Search entries" }));
  return within(await screen.findByRole("dialog")).getByRole("searchbox") as HTMLInputElement;
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

test("opens from the toolbar and searches within the current filters", async () => {
  window.history.replaceState(null, "", "/?tag=Travel&day=2026-10-23");
  render(<SearchToggle />);
  expect(screen.getByRole("button", { name: "Search entries" }).getAttribute("aria-expanded")).toBe(
    "false",
  );
  const input = await openSearch();
  await waitFor(() => expect(document.activeElement).toBe(input));
  fireEvent.change(input, { target: { value: "海" } });
  const params = new URLSearchParams(window.location.search);
  expect(params.get("q")).toBe("海");
  expect(params.get("tag")).toBe("Travel");
  expect(params.get("day")).toBe("2026-10-23");
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Clear search" }));
  expect(new URLSearchParams(window.location.search).has("q")).toBe(false);
});

test("restores a URL query and waits for Chinese composition to finish", async () => {
  window.history.replaceState(null, "", "/?q=sea");
  render(<SearchToggle />);
  const input = await openSearch();
  expect(input.value).toBe("sea");
  fireEvent.compositionStart(input);
  fireEvent.input(input, { target: { value: "旅行" }, isComposing: true });
  expect(new URLSearchParams(window.location.search).get("q")).toBe("sea");
  fireEvent.compositionEnd(input);
  expect(new URLSearchParams(window.location.search).get("q")).toBe("旅行");
});

test("lays out every filter until something is typed, and a filter closes the screen", async () => {
  render(
    <SearchToggle
      filters={{
        voiceNotes: 2,
        tags: [
          ["日記", 403],
          ["夢", 214],
        ],
      }}
    />,
  );
  const input = await openSearch();
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("link", { name: /Voice Notes\s*2/ })).toBeTruthy();
  expect(within(dialog).getByRole("link", { name: /夢\s*214/ })).toBeTruthy();

  fireEvent.change(input, { target: { value: "海" } });
  expect(within(dialog).queryByRole("link", { name: /夢/ })).toBeNull();
  fireEvent.change(input, { target: { value: "" } });

  fireEvent.click(within(dialog).getByRole("link", { name: /夢/ }));
  expect(new URLSearchParams(window.location.search).get("tag")).toBe("夢");
  expect(dialog.hasAttribute("open")).toBe(false);
});

test("closing the screen drops the search", async () => {
  window.history.replaceState(null, "", "/?tag=Travel&q=sea");
  render(<SearchToggle filters={{ voiceNotes: 0, tags: [] }} />);
  await openSearch();
  fireEvent.click(screen.getByRole("button", { name: "Close search" }));
  const params = new URLSearchParams(window.location.search);
  expect(params.has("q")).toBe(false);
  expect(params.get("tag")).toBe("Travel");
  expect(screen.getByRole("dialog", { hidden: true }).hasAttribute("open")).toBe(false);
});
