import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { Recording } from "@/lib/database.types";
import { EntryEditor } from "./entry-editor";

const actions = vi.hoisted(() => ({ deleteRecording: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/(journal)/entries/actions", () => actions);

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
});

function show() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EntryEditor
        entry={{ id: "e", entry_date: "2026-10-24", body: "", tags: [] }}
        tagSuggestions={[]}
        recordings={[{ recording, src: "r2://r" }]}
        menu={null}
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
  expect(actions.deleteRecording).toHaveBeenCalledWith("r");
});

test("a voice note the server couldn't delete comes back", async () => {
  actions.deleteRecording.mockResolvedValue({ error: "boom" });
  show();
  await deleteVoiceNote();
  expect(await screen.findByText("Couldn't delete the voice note. Try again.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Voice note options" })).toBeTruthy();
});
