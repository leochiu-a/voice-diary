export const MAX_PROMPTS = 10;
export const MAX_PROMPT_LENGTH = 120;

// Shown until the user writes their own: they ask after feelings, which a
// day's account of what happened tends to leave out.
export const DEFAULT_PROMPTS = [
  "今天哪個時刻情緒最強烈？當下是什麼感覺？",
  "有人對你說了什麼，讓你有反應嗎？",
  "如果不說「還可以」，今天其實是什麼感覺？",
  "身體現在哪裡緊、哪裡累？",
];

// The questions as edited → as stored: trimmed, without empties or
// duplicates, and at most MAX_PROMPTS of them.
export function normalizePrompts(raw: string[]) {
  const questions = raw.map((q) => q.trim().slice(0, MAX_PROMPT_LENGTH)).filter(Boolean);
  return [...new Set(questions)].slice(0, MAX_PROMPTS);
}
