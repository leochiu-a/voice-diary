import { expect, test } from "vitest";
import { appendParagraph, cardExcerpt } from "./entry-body";

test("starts the body when it is empty", () => {
  expect(appendParagraph("", "今天很好")).toBe("今天很好");
});

test("adds the text as a new paragraph", () => {
  expect(appendParagraph("早上去跑步。", "下午騎車")).toBe("早上去跑步。\n\n下午騎車");
});

test("ignores trailing blank lines before appending", () => {
  expect(appendParagraph("早上去跑步。\n\n\n", "下午騎車")).toBe("早上去跑步。\n\n下午騎車");
});

test("keeps only the start of a long body for its card", () => {
  const lines = Array.from({ length: 20 }, (_, i) => `第${i}行`).join("\n");
  expect(cardExcerpt(`  ${lines}  `).split("\n")).toHaveLength(8);
  expect(cardExcerpt("字".repeat(1000))).toHaveLength(400);
  expect(cardExcerpt("短短一句")).toBe("短短一句");
});
