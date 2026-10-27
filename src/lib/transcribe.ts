import "@tanstack/react-start/server-only";
import OpenAI, { toFile } from "openai";
import { Converter } from "opencc-js/cn2t";
import { env } from "@/lib/env";

let client: OpenAI | undefined;

// `languages` and the prompt follow OpenAI's guidance for picking a writing
// system, but Mandarin still comes back in Simplified some of the time.
// OpenCC turns any Simplified characters into Taiwan Traditional; English and
// text that is already Traditional pass through unchanged.
const toTraditional = Converter({ from: "cn", to: "tw" });

// The model copies the style of the prompt, so its sample shows the format
// wanted: a blank line between paragraphs, and a space between Chinese and
// English or numbers.
const prompt = `以下是一段用台灣繁體中文書寫的個人日記逐字稿，可能夾雜英文。每換一個話題就空一行分段，中文與英文、數字之間加一個半形空格。

今天早上去 7-11 買早餐，然後搭 612 去公司開會。

下午跟朋友去 Subway 吃飯，聊了大概 30 分鐘。`;

export async function transcribe(audio: Uint8Array, fileName: string, mimeType: string) {
  client ??= new OpenAI({ apiKey: env.openaiApiKey });
  const result = await client.audio.transcriptions.create({
    model: "gpt-transcribe",
    file: await toFile(audio, fileName, { type: mimeType.split(";")[0] }),
    languages: ["zh-tw", "en"],
    prompt,
  });
  return toTraditional(result.text.trim());
}
