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
  vi.useRealTimers();
  // jsdom has no Permissions API; a test that needs one defines it.
  Reflect.deleteProperty(navigator, "permissions");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const action of Object.values(actions)) action.mockReset();
});

function show() {
  const transcribe = async (_id: string, work: () => Promise<TranscriptOutcome>) => {
    outcome = await work();
  };
  render(
    <VoiceNotesContext value={{ transcribe, remove: () => {} }}>
      <VoiceRecorder entryId="entry" entryDate="2026-10-24" />
    </VoiceNotesContext>,
  );
}

// Presses the button and lets go ms later.
async function press(name: RegExp | string, ms: number, releasedName: RegExp | string) {
  await act(async () => {
    fireEvent.pointerDown(screen.getByRole("button", { name }), { button: 0, pointerId: 1 });
  });
  now += ms;
  await act(async () => {
    fireEvent.pointerUp(screen.getByRole("button", { name: releasedName }), { pointerId: 1 });
  });
}

const hold = (ms: number) => press(/^(Record|Continue recording)$/, ms, "Recording");
const tap = (name: RegExp | string) => press(name, 100, /^(Recording|Pause recording)$/);

async function finish() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Finish recording" }));
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

  await finish();
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
  expect(screen.getByRole("button", { name: "Record" })).toBeTruthy();
});

test("transcribes the whole recording when a part couldn't be", async () => {
  actions.transcribeSegment
    .mockResolvedValueOnce({ transcript: "第一段。" })
    .mockResolvedValueOnce({ error: "Couldn't turn this part into text" });
  show();

  await hold(1000);
  await hold(1000);
  await screen.findByText(/Part of this couldn't be turned into text/);

  await finish();
  await waitFor(() => expect(outcome).toEqual({ status: "done", transcript: "整段重新轉的文字" }));
  expect(actions.saveRecording.mock.calls[0][0].transcript).toBeUndefined();
  expect(actions.transcribeRecording).toHaveBeenCalledOnce();
});

test("a tap records until the next tap", async () => {
  actions.transcribeSegment.mockResolvedValueOnce({ transcript: "不用一直按著。" });
  show();

  await tap(/^(Record|Continue recording)$/);
  expect(screen.getByRole("button", { name: "Pause recording" })).toBeTruthy();
  expect(actions.transcribeSegment).not.toHaveBeenCalled();

  now += 2000;
  await tap("Pause recording");
  await screen.findByText("不用一直按著。");
  expect(screen.getByRole("button", { name: "Continue recording" })).toBeTruthy();

  await finish();
  await waitFor(() => expect(outcome).toEqual({ status: "done", transcript: "不用一直按著。" }));
  expect(actions.saveRecording.mock.calls[0][0]).toMatchObject({ durationMs: 2200 });
});

test("finishes while recording after a tap", async () => {
  actions.transcribeSegment.mockResolvedValueOnce({ transcript: "直接結束。" });
  show();

  await tap(/^(Record|Continue recording)$/);
  now += 1500;
  await finish();
  await waitFor(() => expect(outcome).toEqual({ status: "done", transcript: "直接結束。" }));
  expect(actions.transcribeSegment).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Record" })).toBeTruthy();
});

test("gives up on a microphone that never opens, so the next press asks again", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const stop = vi.fn();
  const getUserMedia = vi
    .fn()
    .mockReturnValueOnce(new Promise(() => {}))
    .mockResolvedValue({ getTracks: () => [{ stop }] });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: { query: async () => ({ state: "granted" }) },
  });
  show();

  await act(async () => {
    fireEvent.pointerDown(screen.getByRole("button", { name: "Record" }), {
      button: 0,
      pointerId: 1,
    });
  });
  expect(screen.getByRole("button", { name: "Record" }).getAttribute("aria-busy")).toBe("true");

  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(screen.getByText("The microphone didn't open. Try again.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Record" }).getAttribute("aria-busy")).toBeNull();

  await act(async () => {
    fireEvent.pointerDown(screen.getByRole("button", { name: "Record" }), {
      button: 0,
      pointerId: 1,
    });
  });
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: "Recording" })).toBeTruthy();
});
