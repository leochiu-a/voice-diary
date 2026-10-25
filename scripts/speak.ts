import OpenAI from "openai";

// Reads a diary entry aloud with OpenAI text-to-speech, as WAV so its length
// can be read straight from the file.
export async function speak(text: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Set OPENAI_API_KEY to make voice notes.");
    process.exit(1);
  }
  const response = await new OpenAI({ apiKey }).audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "coral",
    input: text,
    instructions: "用台灣口音的華語，像晚上獨自對著手機錄日記，語氣輕鬆、自然，偶爾停頓。",
    response_format: "wav",
  });
  const audio = new Uint8Array(await response.arrayBuffer());
  return { audio, durationMs: wavDurationMs(audio) };
}

// Streamed WAV files leave the header's size fields unset, so the length comes
// from the bytes after the "data" chunk header and the header's byte rate.
export function wavDurationMs(wav: Uint8Array) {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const byteRate = view.getUint32(28, true);
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = String.fromCharCode(...wav.subarray(offset, offset + 4));
    if (id === "data") return Math.round(((wav.length - offset - 8) / byteRate) * 1000);
    offset += 8 + view.getUint32(offset + 4, true);
  }
  throw new Error("WAV file has no data chunk");
}
