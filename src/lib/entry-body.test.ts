import { expect, test } from "vitest";
import { appendParagraph } from "./entry-body";

test("starts the body when it is empty", () => {
  expect(appendParagraph("", "今天很好")).toBe("今天很好");
});

test("adds the text as a new paragraph", () => {
  expect(appendParagraph("早上去跑步。", "下午騎車")).toBe("早上去跑步。\n\n下午騎車");
});

test("ignores trailing blank lines before appending", () => {
  expect(appendParagraph("早上去跑步。\n\n\n", "下午騎車")).toBe("早上去跑步。\n\n下午騎車");
});
