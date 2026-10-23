import { expect, test } from "vitest";
import { containsPattern, searchExcerpt, splitMatches } from "./search";

test("matches the query anywhere, taking % and _ literally", () => {
  expect(containsPattern("夢")).toBe("%夢%");
  expect(containsPattern("100%_done\\")).toBe("%100\\%\\_done\\\\%");
});

test("keeps the excerpt to what a card shows", () => {
  const lines = Array.from({ length: 20 }, (_, i) => `第${i}行`).join("\n");
  expect(searchExcerpt(`  ${lines}  `, "第0").split("\n")).toHaveLength(6);
  expect(searchExcerpt("字".repeat(1000), "字")).toHaveLength(280);
});

test("keeps the usual excerpt when it shows the match", () => {
  expect(searchExcerpt("今天去海邊\n看到夕陽", "夕陽")).toBe("今天去海邊\n看到夕陽");
});

test("starts the excerpt at the match's line when the usual one misses it", () => {
  const body = ["一", "二", "三", "四", "五", "六", "七", "八有海"].join("\n");
  expect(searchExcerpt(body, "海")).toBe("…八有海");
  const long = `${"字".repeat(400)}海`;
  expect(searchExcerpt(long, "海")).toBe(`…${"字".repeat(40)}海`);
});

test("splits text around case-insensitive matches", () => {
  expect(splitMatches("Sea and sea", "SEA")).toEqual(["", "Sea", " and ", "sea", ""]);
  expect(splitMatches("a.b", ".")).toEqual(["a", ".", "b"]);
  expect(splitMatches("text", "")).toEqual(["text"]);
});
