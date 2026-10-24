import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { TranscriptOutcome } from "@/lib/voice-notes";
import { VoiceNotesContext } from "./voice-notes-context";
import { VoiceRecorder } from "./voice-recorder";

const actions = vi.hoisted(() => ({
  createRecordingUpload: vi.fn(),
  transcribeSegment: vi.fn(),
  saveRecording: vi.fn(),
  transcribeRecording: vi.fn(),
}));
vi.mock("@/app/(journal)/entries/actions", () => actions);

// Each recorder's file is named after the recorder, so a test can tell the
// whole recording from the parts made for transcribing.
let recorders = 0;
class FakeRecorder {
  state = "inactive";
  mimeType = "audio/webm";
  name = `recorder-${recorders++}`;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  static isTypeSupported = () => true;
  start() {
    this.state = "recording";
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob([this.name], { type: this.mimeType }) });
      this.onstop?.();
    });
  }
}

let now = 0;
let outcome: TranscriptOutcome | undefined;

beforeEach(() => {
  recorders = 0;
  now = 0;
  outcome = undefined;
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true })),
  );
  vi.spyOn(performance, "now").mockImplementation(() => now);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
  });
  HTMLElement.prototype.setPointerCapture = () => {};
  let uploads = 0;
  actions.createRecordingUpload.mockImplementation(async () => ({
    key: `user/entry/${uploads}.webm`,
    url: `https://r2/${uploads++}`,
  }));
  actions.saveRecording.mockResolvedValue({});
  actions.transcribeRecording.mockResolvedValue({ status: "done", transcript: "整段重新轉的文字" });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const action of Object.values(actions)) action.mockReset();
});

function show() {
  const transcribe = async (_id: string, work: () => Promise<TranscriptOutcome>) => {
    outcome = await work();
  };
  render(
    <VoiceNotesContext value={{ transcribe, forget: () => {} }}>
      <VoiceRecorder entryId="entry" entryDate="2026-10-24" />
    </VoiceNotesContext>,
  );
}

async function hold(ms: number) {
  const button = screen.getByRole("button", { name: /Hold to (record|continue)/ });
  await act(async () => {
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
  });
  now += ms;
  await act(async () => {
    fireEvent.pointerUp(screen.getByRole("button", { name: "Recording" }), { pointerId: 1 });
  });
}

test("transcribes each hold on release and saves one recording with the text in order", async () => {
  actions.transcribeSegment
    .mockResolvedValueOnce({ transcript: "今天去了市場。" })
    .mockResolvedValueOnce({ transcript: "買了蘋果。" });
  show();

  await hold(1200);
  await screen.findByText("今天去了市場。");
  await hold(800);
  await screen.findByText("今天去了市場。買了蘋果。");
  expect(actions.transcribeSegment).toHaveBeenCalledTimes(2);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Finish recording" }));
  });
  await waitFor(() =>
    expect(outcome).toEqual({ status: "done", transcript: "今天去了市場。買了蘋果。" }),
  );

  expect(actions.saveRecording).toHaveBeenCalledOnce();
  expect(actions.saveRecording.mock.calls[0][0]).toMatchObject({
    durationMs: 2000,
    transcript: "今天去了市場。買了蘋果。",
  });
  // The saved file is the whole recording, not one of the parts.
  const saved = actions.saveRecording.mock.calls[0][0].key;
  const upload = vi
    .mocked(fetch)
    .mock.calls.find(([url]) => url === `https://r2/${saved.match(/(\d+)\.webm/)[1]}`);
  expect(await (upload![1]!.body as Blob).text()).toBe("recorder-0");
  expect(actions.transcribeRecording).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /Hold to record/ })).toBeTruthy();
});

test("transcribes the whole recording when a part couldn't be", async () => {
  actions.transcribeSegment
    .mockResolvedValueOnce({ transcript: "第一段。" })
    .mockResolvedValueOnce({ error: "Couldn't turn this part into text" });
  show();

  await hold(1000);
  await hold(1000);
  await screen.findByText(/Part of this couldn't be turned into text/);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Finish recording" }));
  });
  await waitFor(() => expect(outcome).toEqual({ status: "done", transcript: "整段重新轉的文字" }));
  expect(actions.saveRecording.mock.calls[0][0].transcript).toBeUndefined();
  expect(actions.transcribeRecording).toHaveBeenCalledOnce();
});

test("a tap explains how to record instead of starting", async () => {
  show();
  await hold(100);
  expect(screen.getByText("Hold the button while you talk. Let go to pause.")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Hold to record/ })).toBeTruthy();
  expect(actions.createRecordingUpload).not.toHaveBeenCalled();
});
