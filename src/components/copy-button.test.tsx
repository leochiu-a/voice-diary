import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { CopyButton } from "./copy-button";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("copies the text and confirms, then resets", async () => {
  vi.useFakeTimers();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });

  render(<CopyButton text="今天風很大" label="Copy transcript" />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy transcript" })));

  expect(writeText).toHaveBeenCalledWith("今天風很大");
  expect(screen.getByRole("button", { name: "Copied" })).toBeDefined();

  await act(async () => vi.advanceTimersByTime(2000));
  expect(screen.getByRole("button", { name: "Copy transcript" })).toBeDefined();
});
