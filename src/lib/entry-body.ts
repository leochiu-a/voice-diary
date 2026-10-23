// Spoken text joins an entry as its own paragraph at the end of the body. The
// server and the open editor both use this so their copies of the body match.
export function appendParagraph(body: string, text: string) {
  const base = body.trimEnd();
  return base ? `${base}\n\n${text}` : text;
}
