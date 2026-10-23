import { expect, test } from "vitest";
import { htmlToText, localDate, toEntry, uuidV5 } from "./journey";

test("turns Journey's spacer paragraphs into one blank line", () => {
  const html =
    '<p dir="auto"></p><p dir="auto"></p><p dir="auto">今天下雨</p>' +
    '<p dir="auto"></p><p dir="auto"></p><p dir="auto">明天再說</p><p dir="auto"></p>';
  expect(htmlToText(html)).toBe("今天下雨\n\n明天再說");
});

test("keeps adjacent paragraphs and line breaks on their own lines", () => {
  expect(htmlToText("<p>第一行</p><p>第二行<br>第三行</p>")).toBe("第一行\n第二行\n第三行");
});

test("writes lists with markers, numbering ordered ones", () => {
  expect(htmlToText("<ul><li><p>早起</p></li><li><p>跑步</p></li></ul>")).toBe("- 早起\n- 跑步");
  expect(htmlToText("<ol><li>一</li><li>二</li></ol>")).toBe("1. 一\n2. 二");
  expect(htmlToText("<ul><li>外<ul><li>內</li></ul></li></ul>")).toBe("- 外\n  - 內");
});

test("keeps a link's address unless it is the link's text", () => {
  expect(htmlToText('<p>看 <a href="https://example.com/a">這篇</a></p>')).toBe(
    "看 這篇 (https://example.com/a)",
  );
  expect(htmlToText('<p><a href="https://example.com">https://example.com</a></p>')).toBe(
    "https://example.com",
  );
});

test("drops formatting and decodes entities", () => {
  expect(htmlToText("<h1>標題</h1><p><strong>粗</strong> &amp; <em>斜</em>&nbsp;&lt;3</p>")).toBe(
    "標題\n粗 & 斜 <3",
  );
});

test("keeps horizontal rules and code blocks", () => {
  expect(htmlToText("<p>上</p><hr><p>下</p>")).toBe("上\n---\n下");
  expect(htmlToText("<pre><code>a\n  b</code></pre>")).toBe("a\n  b");
});

test("dates an entry in its own time zone", () => {
  // 23:50 in Taipei is still the 22nd, though it is 15:50 UTC.
  expect(localDate(Date.parse("2026-10-22T15:50:01Z"), "Asia/Taipei")).toBe("2026-10-22");
  expect(localDate(Date.parse("2026-10-22T16:30:00Z"), "Asia/Taipei")).toBe("2026-10-23");
});

test("derives the standard version 5 UUID", () => {
  // RFC 4122's example: "www.example.com" in the DNS namespace.
  expect(uuidV5("www.example.com", "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(
    "2ed6657d-e927-568b-95e1-2665a8aea6a2",
  );
});

test("converts a Journey entry into a diary entry the same way every time", () => {
  const journey = {
    id: "1639315666287-y6ca44hjuimf5m09",
    date_journal: Date.parse("2021-12-12T13:27:46Z"),
    date_modified: Date.parse("2021-12-13T01:00:00Z"),
    timezone: "Asia/Taipei",
    type: "html" as const,
    text: '<p dir="auto">夢到考試</p>',
    tags: ["夢", " 夢 ", "#日記"],
  };
  const entry = toEntry(journey);
  expect(entry).toEqual({
    id: toEntry(journey).id,
    entry_date: "2021-12-12",
    body: "夢到考試",
    tags: ["夢", "日記"],
    created_at: "2021-12-12T13:27:46.000Z",
    updated_at: "2021-12-13T01:00:00.000Z",
  });
  expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
