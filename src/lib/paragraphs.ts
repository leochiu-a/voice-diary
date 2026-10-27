// A transcript comes back as one block. It is split into paragraphs at
// sentence ends: before a sentence that opens a new topic, or once a
// paragraph grows long. Only line breaks are added, never words.

// Words that open a new part of the day in a spoken diary, optionally after
// the filler 然後.
const TOPIC_START = /^(然後)?(後來|結束以後|晚上|下午|早上|中午|突然|那今天|但我自己|最後)/;

// A topic word starts a paragraph only once the current one has this many
// characters, so short sentences don't each become a paragraph.
const MIN_LENGTH = 60;
// Past this, the next sentence starts a paragraph regardless.
const MAX_LENGTH = 160;

function sentences(text: string) {
  return (text.match(/[^。！？!?]+[。！？!?]*/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
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
