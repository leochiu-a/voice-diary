import { expect, test } from "vitest";
import { splitParagraphs } from "./paragraphs";

const filler = "今天天氣很好我在家裡看書看了很久，"; // 17 characters

test("keeps a short transcript as one paragraph", () => {
  expect(splitParagraphs("早上去跑步。下午騎車。")).toBe("早上去跑步。下午騎車。");
});

test("starts a paragraph before a sentence that opens a new topic", () => {
  const morning = `${filler.repeat(4)}好累。`;
  expect(splitParagraphs(`${morning}然後晚上去吃飯。`)).toBe(`${morning}\n\n然後晚上去吃飯。`);
});

test("keeps a topic word in the same paragraph while it is still short", () => {
  expect(splitParagraphs("早上去跑步。晚上去吃飯。")).toBe("早上去跑步。晚上去吃飯。");
});

test("starts a paragraph once one grows long", () => {
  const long = `${filler.repeat(10)}好累。`;
  expect(splitParagraphs(`${long}我去吃飯。`)).toBe(`${long}\n\n我去吃飯。`);
});

test("never breaks inside a sentence", () => {
  const sentence = `${filler.repeat(12)}好累。`;
  expect(splitParagraphs(sentence)).toBe(sentence);
});

test("keeps every character apart from whitespace", () => {
  const text = `${filler.repeat(4)}好累。 然後晚上去吃 Subway！${filler.repeat(9)}結束`;
  const strip = (value: string) => value.replace(/\s+/g, "");
  expect(strip(splitParagraphs(text))).toBe(strip(text));
});

test("returns an empty transcript as is", () => {
  expect(splitParagraphs("  ")).toBe("");
});
