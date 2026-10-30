import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { TranscriptOutcome } from "@/lib/voice-notes";
import { VoiceNotesContext } from "./voice-notes-context";
import { createRecorderPopover, RecordButton, VoiceRecorder } from "./voice-recorder";

const actions = vi.hoisted(() => ({
  createRecordingUpload: vi.fn(),
  transcribeSegment: vi.fn(),
  saveRecording: vi.fn(),
  transcribeRecording: vi.fn(),
}));
vi.mock("@/server/entries", () => actions);

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

// Renders the recorder and opens its sheet.
async function show() {
  const transcribe = async (_id: string, work: () => Promise<TranscriptOutcome>) => {
    outcome = await work();
  };
  render(
    <VoiceNotesContext value={{ transcribe, remove: () => {} }}>
      <VoiceRecorder entryId="entry" entryDate="2026-10-24" />
    </VoiceNotesContext>,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Record a voice note" }));
  });
  await screen.findByRole("button", { name: "Record" });
}

// Finishing closes the sheet, leaving the button that opens it.
async function expectClosed() {
  await waitFor(() => expect(screen.queryByRole("button", { name: "Record" })).toBeNull());
  expect(screen.getByRole("button", { name: "Record a voice note" })).toBeTruthy();
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
  await show();

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
  expect(actions.saveRecording.mock.calls[0][0].data).toMatchObject({
    durationMs: 2000,
    transcript: "今天去了市場。買了蘋果。",
  });
  // The saved file is the whole recording, not one of the parts.
  const saved = actions.saveRecording.mock.calls[0][0].data.key;
  const upload = vi
    .mocked(fetch)
    .mock.calls.find(([url]) => url === `https://r2/${saved.match(/(\d+)\.webm/)[1]}`);
  expect(await (upload![1]!.body as Blob).text()).toBe("recorder-0");
  expect(actions.transcribeRecording).not.toHaveBeenCalled();
  await expectClosed();
});

test("transcribes the whole recording when a part couldn't be", async () => {
  actions.transcribeSegment
    .mockResolvedValueOnce({ transcript: "第一段。" })
    .mockResolvedValueOnce({ error: "Couldn't turn this part into text" });
  await show();

  await hold(1000);
  await hold(1000);
  await screen.findByText(/Part of this couldn't be turned into text/);

  await finish();
  await waitFor(() => expect(outcome).toEqual({ status: "done", transcript: "整段重新轉的文字" }));
  expect(actions.saveRecording.mock.calls[0][0].data.transcript).toBeUndefined();
  expect(actions.transcribeRecording).toHaveBeenCalledOnce();
});

test("a tap records until the next tap", async () => {
  actions.transcribeSegment.mockResolvedValueOnce({ transcript: "不用一直按著。" });
  await show();

  await tap(/^(Record|Continue recording)$/);
  expect(screen.getByRole("button", { name: "Pause recording" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Finish recording" })).toBeNull();
  expect(actions.transcribeSegment).not.toHaveBeenCalled();

  now += 2000;
  await tap("Pause recording");
  await screen.findByText("不用一直按著。");
  expect(screen.getByRole("button", { name: "Continue recording" })).toBeTruthy();

  await finish();
  await waitFor(() => expect(outcome).toEqual({ status: "done", transcript: "不用一直按著。" }));
  expect(actions.saveRecording.mock.calls[0][0].data).toMatchObject({ durationMs: 2200 });
});

test("keeps the sheet open while a recording is in progress", async () => {
  await show();
  await tap(/^(Record|Continue recording)$/);

  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
  });
  expect(screen.getByRole("button", { name: "Pause recording" })).toBeTruthy();
});

test("discards the recording, once confirmed, without saving it", async () => {
  actions.transcribeSegment.mockResolvedValueOnce({ transcript: "不要了。" });
  await show();

  await hold(1000);
  await tap(/^(Record|Continue recording)$/);
  now += 1000;
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Discard recording" }));
  });
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Keep" }));
  });
  expect(screen.getByRole("button", { name: "Pause recording" })).toBeTruthy();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Discard recording" }));
  });
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Discard" }));
  });

  expect(screen.getByRole("button", { name: "Record" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Finish recording" })).toBeNull();
  expect(screen.getByText("0:00")).toBeTruthy();
  await waitFor(() => expect(actions.transcribeSegment).toHaveBeenCalledOnce());
  expect(screen.queryByText("不要了。")).toBeNull();
  expect(actions.saveRecording).not.toHaveBeenCalled();
});

test("confirms the discard outside the sheet's container, where taps reach it", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  render(
    <VoiceNotesContext value={{ transcribe: async () => {}, remove: () => {} }}>
      <VoiceRecorder entryId="entry" entryDate="2026-10-24" sheetContainer={container} />
    </VoiceNotesContext>,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Record a voice note" }));
  });
  await tap(/^(Record|Continue recording)$/);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Discard recording" }));
  });

  const dialog = await screen.findByRole("alertdialog");
  expect(container.contains(dialog)).toBe(false);
  container.remove();
});

test("pauses a voice note that is playing before it records", async () => {
  await show();
  const audio = document.createElement("audio");
  document.body.append(audio);
  let paused = false;
  audio.pause = () => {
    paused = true;
  };

  await tap(/^(Record|Continue recording)$/);
  expect(paused).toBe(true);
  audio.remove();
});

test("gives up on a microphone that never opens, so the next press asks again", async () => {
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
  await show();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

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

test("on a wide screen, the toolbar's button opens the recorder as a popover", async () => {
  const matchMedia = window.matchMedia;
  window.matchMedia = (query) => ({ ...matchMedia(query), matches: true });
  const popover = createRecorderPopover();
  render(
    <VoiceNotesContext value={{ transcribe: async () => {}, remove: () => {} }}>
      <RecordButton popover={popover} />
      <VoiceRecorder entryId="entry" entryDate="2026-10-24" popover={popover} />
    </VoiceNotesContext>,
  );

  // The phone's bottom button isn't there; the toolbar's is.
  expect(screen.getAllByRole("button", { name: "Record a voice note" })).toHaveLength(1);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Record a voice note" }));
  });
  await screen.findByRole("button", { name: "Record" });
  await tap(/^(Record|Continue recording)$/);
  expect(screen.getByRole("button", { name: "Pause recording" })).toBeTruthy();
  window.matchMedia = matchMedia;
});
