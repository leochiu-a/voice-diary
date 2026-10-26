import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { Recording } from "@/lib/database.types";
import { EntryEditor } from "./entry-editor";

const actions = vi.hoisted(() => ({ deleteRecording: vi.fn(), saveEntry: vi.fn() }));
vi.mock("@tanstack/react-router", () => import("@/test/router"));
vi.mock("@/server/entries", () => actions);
vi.mock("@/server/journal", () => ({}));

const recording = {
  id: "r",
  entry_id: "e",
  object_key: "user/e/r.m4a",
  mime_type: "audio/mp4",
  duration_ms: 3000,
  transcript: "今天去海邊",
  transcript_status: "done",
  created_at: "2026-10-24T00:00:00Z",
} as Recording;

afterEach(() => {
  cleanup();
  actions.deleteRecording.mockReset();
  actions.saveEntry.mockReset();
});

function show({ startEditing = true, body = "" } = {}) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EntryEditor
        entry={{ id: "e", entry_date: "2026-10-24", body, tags: ["旅行"] }}
        tagSuggestions={[]}
        recordings={[{ recording, src: "r2://r" }]}
        menu={null}
        startEditing={startEditing}
      />
    </QueryClientProvider>,
  );
}

async function deleteVoiceNote() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Voice note options" }));
  });
  await act(async () => {
    fireEvent.click(await screen.findByText("Delete Voice Note"));
  });
}

test("a deleted voice note goes before the server answers", async () => {
  actions.deleteRecording.mockReturnValue(new Promise(() => {}));
  show();
  await deleteVoiceNote();
  expect(screen.queryByRole("button", { name: "Voice note options" })).toBeNull();
  expect(actions.deleteRecording).toHaveBeenCalledWith({ data: "r" });
});

test("a voice note the server couldn't delete comes back", async () => {
  actions.deleteRecording.mockResolvedValue({ error: "boom" });
  show();
  await deleteVoiceNote();
  expect(await screen.findByText("Couldn't delete the voice note. Try again.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Voice note options" })).toBeTruthy();
});

test("a saved entry opens to read, with nothing to change until Edit", () => {
  show({ startEditing: false, body: "風很大" });
  expect(screen.getByText("風很大")).toBeTruthy();
  expect(screen.getByText("旅行")).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Entry" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Voice note options" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Record a voice note" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));

  expect(actions.saveEntry).not.toHaveBeenCalled();
  const field = screen.getByRole("textbox", { name: "Entry" }) as HTMLTextAreaElement;
  expect(field.value).toBe("風很大");
  expect(document.activeElement).toBe(field);
  expect(screen.getByRole("button", { name: "Voice note options" })).toBeTruthy();
});

test("Done saves and goes back to reading the saved text", async () => {
  actions.saveEntry.mockResolvedValue({});
  show({ startEditing: false, body: "風很大" });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Entry" }), {
    target: { value: "風很大，浪也很大" },
  });

  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Done" })));

  expect(actions.saveEntry).toHaveBeenCalledWith({
    data: { entryId: "e", body: "風很大，浪也很大", entryDate: "2026-10-24" },
  });
  expect(screen.queryByRole("textbox", { name: "Entry" })).toBeNull();
  expect(screen.getByText("風很大，浪也很大")).toBeTruthy();
});
