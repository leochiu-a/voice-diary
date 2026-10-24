import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { AudioPlayer } from "./audio-player";

afterEach(cleanup);

function load(seconds: number) {
  const audio = document.querySelector("audio")!;
  Object.defineProperty(audio, "duration", { configurable: true, value: seconds });
  fireEvent.loadedMetadata(audio);
}

test("shows the file's length once known, so playback never runs past it", () => {
  render(<AudioPlayer src="note.mp4" durationMs={2900} />);
  expect(screen.getByText("0:00 / 0:02")).toBeTruthy();

  load(3.05);
  expect(screen.getByText("0:00 / 0:03")).toBeTruthy();
});

test("keeps the recorded length for a file that reports no duration", () => {
  render(<AudioPlayer src="note.webm" durationMs={2900} />);
  load(Infinity);
  expect(screen.getByText("0:00 / 0:02")).toBeTruthy();
});
