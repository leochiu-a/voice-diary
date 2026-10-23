export const MAX_TAG_LENGTH = 32;

// One tag as the user typed it → its stored form: no leading "#", single spaces, trimmed.
export function cleanTag(raw: string) {
  return raw.replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
}

// Drops empties and case-insensitive duplicates, keeping the first spelling.
export function normalizeTags(raw: string[]) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const tag of raw.map(cleanTag)) {
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

// Tags with how many entries use them, most used first.
export function tagCounts(entries: { tags: string[] }[]) {
  const counts = new Map<string, number>();
  for (const tag of entries.flatMap((entry) => entry.tags))
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
