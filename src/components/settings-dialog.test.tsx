import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SettingsDialog } from "./settings-dialog";

const actions = vi.hoisted(() => ({ getPrompts: vi.fn(), savePrompts: vi.fn() }));
vi.mock("@/server/prompts", () => actions);
vi.mock("@/server/entries", () => ({}));
vi.mock("@/server/journal", () => ({}));

afterEach(() => {
  cleanup();
  actions.getPrompts.mockReset();
  actions.savePrompts.mockReset();
});

async function show(prompts: string[]) {
  actions.getPrompts.mockResolvedValue(prompts);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SettingsDialog open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
  await screen.findByRole("textbox", { name: "New prompt" });
}

async function commit(field: HTMLElement, value: string) {
  field.focus();
  fireEvent.change(field, { target: { value } });
  await act(async () => {
    fireEvent.keyDown(field, { key: "Enter" });
  });
}

test("a prompt added in the last row is saved after the others", async () => {
  actions.savePrompts.mockResolvedValue({});
  await show(["今天開心嗎？"]);
  await commit(screen.getByRole("textbox", { name: "New prompt" }), "誰讓你有感覺？");
  expect(actions.savePrompts).toHaveBeenCalledWith({ data: ["今天開心嗎？", "誰讓你有感覺？"] });
  expect(screen.getByRole("textbox", { name: "Prompt 2" })).toHaveProperty(
    "value",
    "誰讓你有感覺？",
  );
});

test("a prompt is edited in place", async () => {
  actions.savePrompts.mockResolvedValue({});
  await show(["今天開心嗎？", "身體累嗎？"]);
  await commit(screen.getByRole("textbox", { name: "Prompt 2" }), "身體哪裡緊？");
  expect(actions.savePrompts).toHaveBeenCalledWith({ data: ["今天開心嗎？", "身體哪裡緊？"] });
});

test("deleting a prompt saves the rest", async () => {
  actions.savePrompts.mockResolvedValue({});
  await show(["今天開心嗎？", "身體累嗎？"]);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Delete “今天開心嗎？”" }));
  });
  expect(actions.savePrompts).toHaveBeenCalledWith({ data: ["身體累嗎？"] });
  expect(screen.queryByRole("textbox", { name: "Prompt 2" })).toBeNull();
});

test("a prompt the server couldn't save is undone", async () => {
  actions.savePrompts.mockResolvedValue({ error: "offline" });
  await show(["今天開心嗎？"]);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Delete “今天開心嗎？”" }));
  });
  expect(screen.getByRole("textbox", { name: "Prompt 1" })).toHaveProperty("value", "今天開心嗎？");
  expect(screen.getByText("Couldn't save the prompts. Try again.")).toBeTruthy();
});
