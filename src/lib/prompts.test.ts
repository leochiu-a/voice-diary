import { expect, test } from "vitest";
import { MAX_PROMPTS, normalizePrompts } from "./prompts";

test("trims each question and drops empty ones", () => {
  expect(normalizePrompts(["  今天開心嗎？ ", "", "身體累嗎？", "   "])).toEqual([
    "今天開心嗎？",
    "身體累嗎？",
  ]);
});

test("a repeated question is kept once", () => {
  expect(normalizePrompts(["今天開心嗎？", "今天開心嗎？"])).toEqual(["今天開心嗎？"]);
});

test("keeps at most MAX_PROMPTS questions", () => {
  const questions = Array.from({ length: MAX_PROMPTS + 3 }, (_, i) => `Q${i}`);
  expect(normalizePrompts(questions)).toHaveLength(MAX_PROMPTS);
});

test("no questions at all is allowed", () => {
  expect(normalizePrompts([])).toEqual([]);
});
