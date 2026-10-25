import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { AudioPlayer } from "./audio-player";

afterEach(cleanup);

function show(src: string, durationMs: number) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AudioPlayer recordingId="note" src={src} durationMs={durationMs} />
    </QueryClientProvider>,
  );
}

function load(seconds: number) {
  const audio = document.querySelector("audio")!;
  Object.defineProperty(audio, "duration", { configurable: true, value: seconds });
  fireEvent.loadedMetadata(audio);
}

test("shows the file's length once known, so playback never runs past it", () => {
  show("note.mp4", 2900);
  expect(screen.getByText("0:02")).toBeTruthy();

  load(3.05);
  expect(screen.getByText("0:03")).toBeTruthy();
});

test("keeps the recorded length for a file that reports no duration", () => {
  show("note.webm", 2900);
  load(Infinity);
  expect(screen.getByText("0:02")).toBeTruthy();
});

test("the waveform seeks with the keyboard, within the recording", () => {
  show("note.mp4", 12000);
  load(12);
  const waveform = screen.getByRole("slider", { name: "Seek" });

  fireEvent.keyDown(waveform, { key: "ArrowRight" });
  expect(waveform.getAttribute("aria-valuenow")).toBe("5");
  expect(document.querySelector("audio")!.currentTime).toBe(5);
  expect(screen.getByText("0:05")).toBeTruthy();

  fireEvent.keyDown(waveform, { key: "End" });
  expect(waveform.getAttribute("aria-valuenow")).toBe("12");
  fireEvent.keyDown(waveform, { key: "ArrowRight" });
  expect(waveform.getAttribute("aria-valuenow")).toBe("12");
  fireEvent.keyDown(waveform, { key: "Home" });
  expect(waveform.getAttribute("aria-valuenow")).toBe("0");
});
