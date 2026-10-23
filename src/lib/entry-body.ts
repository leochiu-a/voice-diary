// Spoken text joins an entry as its own paragraph at the end of the body. The
// server and the open editor both use this so their copies of the body match.
export function appendParagraph(body: string, text: string) {
  const base = body.trimEnd();
  return base ? `${base}\n\n${text}` : text;
}

// A list card shows at most six lines of an entry, so the list only sends the
// start of each body rather than the whole of every entry.
export function cardExcerpt(body: string) {
  return body.trim().split("\n").slice(0, 6).join("\n").slice(0, 280);
}
