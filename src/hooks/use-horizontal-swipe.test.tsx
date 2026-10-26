import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useHorizontalSwipe } from "./use-horizontal-swipe";

function Page({ onSwipe }: { onSwipe: (direction: string) => void }) {
  useHorizontalSwipe(onSwipe);
  return (
    <>
      <p>今天風很大</p>
      <textarea aria-label="Entry" />
      <div data-slot="slider">0:12</div>
    </>
  );
}

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function swipe(target: Element, from: [number, number], to: [number, number], ms = 100) {
  vi.useFakeTimers();
  fireEvent.touchStart(target, { touches: [{ clientX: from[0], clientY: from[1] }] });
  vi.advanceTimersByTime(ms);
  fireEvent.touchEnd(target, { changedTouches: [{ clientX: to[0], clientY: to[1] }] });
}

test("a quick sideways flick reports its direction", () => {
  const onSwipe = vi.fn();
  render(<Page onSwipe={onSwipe} />);
  const text = screen.getByText("今天風很大");

  swipe(text, [300, 400], [150, 410]);
  swipe(text, [100, 400], [250, 390]);

  expect(onSwipe.mock.calls).toEqual([["left"], ["right"]]);
});

test("scrolls, slow drags, edge swipes and sliders aren't swipes", () => {
  const onSwipe = vi.fn();
  render(<Page onSwipe={onSwipe} />);
  const text = screen.getByText("今天風很大");

  swipe(text, [200, 600], [150, 300]);
  swipe(text, [300, 400], [150, 400], 900);
  swipe(text, [10, 400], [200, 400]);
  swipe(screen.getByText("0:12"), [300, 400], [150, 400]);

  expect(onSwipe).not.toHaveBeenCalled();
});

test("swiping while typing does nothing", () => {
  const onSwipe = vi.fn();
  render(<Page onSwipe={onSwipe} />);
  const entry = screen.getByRole("textbox", { name: "Entry" });
  entry.focus();

  swipe(entry, [300, 400], [150, 400]);

  expect(onSwipe).not.toHaveBeenCalled();
});
