import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { VoiceNote } from "@/lib/voice-notes";
import { RecordingItem } from "./recording-item";

afterEach(cleanup);

function show(note: VoiceNote) {
  const { rerender } = render(
    <QueryClientProvider client={new QueryClient()}>
      <RecordingItem note={note} editable={false} />
    </QueryClientProvider>,
  );
  return (next: VoiceNote) =>
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <RecordingItem note={next} editable={false} />
      </QueryClientProvider>,
    );
}

const tile = () => screen.getByRole("listitem");
const note = { id: "a", src: "a.mp4", durationMs: 3000, waveform: [] };

test("a voice note just recorded fades in", () => {
  show({ ...note, transcription: "running" });
  expect(tile().className).toContain("fade-in");
});

test("a saved voice note shows at once, as when swiping to its entry", () => {
  show({ ...note, transcription: { status: "done", transcript: "你好" } });
  expect(tile().className).not.toContain("fade-in");
});

test("trying a saved voice note again doesn't fade it in", () => {
  const update = show({ ...note, transcription: { status: "failed", transcript: null } });
  update({ ...note, transcription: "running" });
  expect(tile().className).not.toContain("fade-in");
});
