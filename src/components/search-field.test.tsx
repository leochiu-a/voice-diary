import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SearchToggle } from "./search-field";

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useSearchParams: () => {
      const search = useSyncExternalStore(
        (notify) => {
          window.addEventListener("popstate", notify);
          return () => window.removeEventListener("popstate", notify);
        },
        () => window.location.search,
      );
      return new URLSearchParams(search);
    },
  };
});

// Next integrates replaceState with useSearchParams; emulate that notification.
const replaceState = window.history.replaceState.bind(window.history);
vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
  replaceState(...args);
  window.dispatchEvent(new PopStateEvent("popstate"));
});

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
  fireEvent.click(screen.getByRole("button", { name: "Search entries" }));
  const input = await screen.findByRole("searchbox");
  await waitFor(() => expect(document.activeElement).toBe(input));
  fireEvent.change(input, { target: { value: "海" } });
  const params = new URLSearchParams(window.location.search);
  expect(params.get("q")).toBe("海");
  expect(params.get("tag")).toBe("Travel");
  expect(params.get("day")).toBe("2026-10-23");
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(new URLSearchParams(window.location.search).has("q")).toBe(false);
});

test("restores a URL query and waits for Chinese composition to finish", async () => {
  window.history.replaceState(null, "", "/?q=sea");
  render(<SearchToggle />);
  fireEvent.click(screen.getByRole("button", { name: "Search entries" }));
  const input = (await screen.findByRole("searchbox")) as HTMLInputElement;
  expect(input.value).toBe("sea");
  fireEvent.compositionStart(input);
  fireEvent.input(input, { target: { value: "旅行" }, isComposing: true });
  expect(new URLSearchParams(window.location.search).get("q")).toBe("sea");
  fireEvent.compositionEnd(input);
  expect(new URLSearchParams(window.location.search).get("q")).toBe("旅行");
});
