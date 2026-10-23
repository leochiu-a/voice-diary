import { createHash } from "node:crypto";
import { normalizeTags } from "@/lib/tags";

// One entry of a Journey export (journey.cloud), as its JSON files or the
// merged array of them hold it. Only the fields the diary keeps are listed.
export type JourneyEntry = {
  id: string;
  // Milliseconds since the epoch, written in `timezone`.
  date_journal: number;
  date_modified: number;
  timezone: string;
  type: "html" | "markdown";
  text: string;
  tags: string[];
};

export type ImportedEntry = {
  id: string;
  entry_date: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

// Any fixed UUID works as the namespace; it only has to stay the same so that
// importing the same Journey entry again maps to the same diary entry.
const JOURNEY_NAMESPACE = "6f1c2b8e-5d43-4a8f-9b2e-0c7d1e3a9f54";

export function toEntry(entry: JourneyEntry): ImportedEntry {
  return {
    id: uuidV5(entry.id, JOURNEY_NAMESPACE),
    entry_date: localDate(entry.date_journal, entry.timezone),
    body: entry.type === "html" ? htmlToText(entry.text) : entry.text.trim(),
    tags: normalizeTags(entry.tags),
    created_at: new Date(entry.date_journal).toISOString(),
    updated_at: new Date(entry.date_modified || entry.date_journal).toISOString(),
  };
}

// The calendar date in the entry's own time zone: an entry written late at
// night in Taipei is still that day, not the next one in UTC.
export function localDate(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(ms);
}

// RFC 4122 version 5: a stable UUID derived from a name.
export function uuidV5(name: string, namespace: string) {
  const hash = createHash("sha1")
    .update(Buffer.from(namespace.replaceAll("-", ""), "hex"))
    .update(name)
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const BLOCKS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "li"]);
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// Journey's rich text to the diary's plain text. Each paragraph becomes a line;
// Journey's empty paragraphs, which it uses as spacing, become one blank line
// between paragraphs, as the diary writes them. Lists keep their markers and
// links keep their address; other formatting is dropped.
export function htmlToText(html: string) {
  const lines: string[] = [];
  let line = "";
  let pre = 0;
  const lists: { ordered: boolean; count: number }[] = [];
  let link: { href: string; start: number } | undefined;
  // The marker of the list item just opened, until its text follows.
  let marker: string | undefined;

  const endLine = () => {
    lines.push(line.trimEnd());
    line = "";
    marker = undefined;
  };

  for (const [, closing, name, attrs, text] of html.matchAll(
    /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi,
  )) {
    if (text !== undefined) {
      // Whitespace between tags is markup, not content.
      if (!pre && !text.trim() && !line) continue;
      line += decodeEntities(text);
      continue;
    }
    const tag = name.toLowerCase();
    if (tag === "br") {
      endLine();
    } else if (tag === "hr") {
      if (line) endLine();
      lines.push("---");
    } else if (tag === "ul" || tag === "ol") {
      if (closing) lists.pop();
      else lists.push({ ordered: tag === "ol", count: 0 });
    } else if (tag === "a") {
      if (!closing) {
        link = { href: /href="([^"]*)"/i.exec(attrs)?.[1] ?? "", start: line.length };
      } else if (link) {
        const label = line.slice(link.start).trim();
        const href = decodeEntities(link.href);
        if (href && href !== label) line += ` (${href})`;
        link = undefined;
      }
    } else if (BLOCKS.has(tag)) {
      if (tag === "pre") pre += closing ? -1 : 1;
      if (closing) {
        // A list item's own paragraph has already ended its line.
        if (tag !== "li" || line) endLine();
      } else {
        // A paragraph inside a list item continues the item's marker.
        if (line && line !== marker) endLine();
        if (tag === "li") {
          const list = lists.at(-1);
          marker =
            "  ".repeat(Math.max(0, lists.length - 1)) +
            (list?.ordered ? `${++list.count}. ` : "- ");
          line = marker;
        }
      }
    }
  }
  if (line) endLine();

  // One blank line at most between paragraphs, none at either end.
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? match;
    const point = code[1] === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return String.fromCodePoint(point);
  });
}
