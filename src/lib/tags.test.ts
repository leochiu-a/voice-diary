import { describe, expect, test } from "vitest";
import { cleanTag, MAX_TAG_LENGTH, normalizeTags, tagCounts } from "./tags";

describe("cleanTag", () => {
  test("drops leading # and collapses whitespace", () => {
    expect(cleanTag("##  travel   notes  ")).toBe("travel notes");
  });

  test("caps the length", () => {
    expect(cleanTag("a".repeat(MAX_TAG_LENGTH + 10))).toHaveLength(MAX_TAG_LENGTH);
  });
});

describe("normalizeTags", () => {
  test("drops empty tags and case-insensitive duplicates, keeping the first spelling", () => {
    expect(normalizeTags(["Travel", "#", "travel", " 旅行 ", "旅行"])).toEqual(["Travel", "旅行"]);
  });
});

describe("tagCounts", () => {
  test("counts entries per tag, most used first, ties alphabetical", () => {
    const entries = [{ tags: ["work", "family"] }, { tags: ["work"] }, { tags: ["art"] }];
    expect(tagCounts(entries)).toEqual([
      ["work", 2],
      ["art", 1],
      ["family", 1],
    ]);
  });
});
