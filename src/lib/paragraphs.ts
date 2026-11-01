// A transcript comes back as one block and is split into paragraphs at
// sentence ends. Only line breaks are added, never words.
//
// splitParagraphs is the rule-based split, used when the model in
// paragraph-breaks.ts can't be reached: it breaks before a sentence that
// opens a new topic, or once a paragraph grows long.

// Words that open a new part of the day in a spoken diary, optionally after
// the filler 然後.
const TOPIC_START = /^(然後)?(後來|結束以後|晚上|下午|早上|中午|突然|那今天|但我自己|最後)/;

// A topic word starts a paragraph only once the current one has this many
// characters, so short sentences don't each become a paragraph.
const MIN_LENGTH = 60;
// Past this, the next sentence starts a paragraph regardless.
const MAX_LENGTH = 160;

export function sentences(text: string) {
  return (text.match(/[^。！？!?]+[。！？!?]*/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

// Starts a paragraph before each sentence whose index is in `breaks`.
export function joinAtBreaks(sentences: readonly string[], breaks: readonly number[]) {
  return sentences
    .map((sentence, i) => (i > 0 && breaks.includes(i) ? `\n\n${sentence}` : sentence))
    .join("");
}

export function splitParagraphs(text: string) {
  const paragraphs: string[] = [];
  let current = "";
  for (const sentence of sentences(text)) {
    const newTopic = current.length >= MIN_LENGTH && TOPIC_START.test(sentence);
    if (current && (newTopic || current.length >= MAX_LENGTH)) {
      paragraphs.push(current);
      current = "";
    }
    current += sentence;
  }
  if (current) paragraphs.push(current);
  return paragraphs.join("\n\n");
}
