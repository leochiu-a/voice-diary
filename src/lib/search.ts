// The query as an ilike pattern matching it anywhere, with its own % and _
// taken literally.
export function containsPattern(query: string) {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

// At most what a card's six lines show of a body, so search results send only
// that much of each match.
function cardExcerpt(body: string) {
  return body.trim().split("\n").slice(0, 6).join("\n").slice(0, 280);
}

// A search result's card text: the usual excerpt when it already shows the
// match, otherwise one starting at the line (or a little before) the match is on.
export function searchExcerpt(body: string, query: string) {
  const excerpt = cardExcerpt(body);
  const at = body.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0 || excerpt.toLowerCase().includes(query.toLowerCase())) return excerpt;
  const start = Math.max(body.lastIndexOf("\n", at) + 1, at - 40);
  return `…${cardExcerpt(body.slice(start))}`;
}

// Splits text around each case-insensitive occurrence of the query, so the
// matches can be marked: odd-numbered parts are the matches.
export function splitMatches(text: string, query: string) {
  if (!query) return [text];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.split(new RegExp(`(${escaped})`, "i"));
}
