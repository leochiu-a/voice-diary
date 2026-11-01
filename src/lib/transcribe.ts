import "@tanstack/react-start/server-only";
import { toFile } from "openai";
import { Converter } from "opencc-js/cn2t";
import { openai } from "@/lib/openai";

// `languages` and the prompt follow OpenAI's guidance for picking a writing
// system, but Mandarin still comes back in Simplified some of the time.
// OpenCC turns any Simplified characters into Taiwan Traditional; English and
// text that is already Traditional pass through unchanged.
const toTraditional = Converter({ from: "cn", to: "tw" });

// The model never adds line breaks; a whole recording's text is split into
// paragraphs once it is complete, by paragraphs() in paragraph-breaks.ts.
export async function transcribe(audio: Uint8Array, fileName: string, mimeType: string) {
  const result = await openai().audio.transcriptions.create({
    model: "gpt-transcribe",
    file: await toFile(audio, fileName, { type: mimeType.split(";")[0] }),
    languages: ["zh-tw", "en"],
    prompt: "以下是一段用台灣繁體中文書寫的個人日記逐字稿，可能夾雜英文。",
  });
  return toTraditional(result.text);
}
