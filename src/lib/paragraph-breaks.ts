import "@tanstack/react-start/server-only";
import { openai } from "@/lib/openai";
import { joinAtBreaks, sentences, splitParagraphs } from "@/lib/paragraphs";

const instructions =
  "這是一篇口述日記的逐字稿，每行開頭是句子編號。請找出換話題的地方，回傳應該在哪些句子之前分段。一段通常是同一件事或同一個時段，不要每句都分段。";

// A small model reads the numbered sentences and names the ones that open a
// new topic. It returns only numbers, so the text itself can't change. If the
// call fails, the rule-based split is used instead.
export async function paragraphs(text: string) {
  const list = sentences(text);
  if (list.length < 2) return list.join("");
  try {
    const response = await openai().responses.create({
      model: "gpt-5.4-mini",
      reasoning: { effort: "low" },
      instructions,
      input: list.map((sentence, i) => `${i} ${sentence}`).join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "paragraph_breaks",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["breaks"],
            properties: { breaks: { type: "array", items: { type: "integer" } } },
          },
        },
      },
    });
    const { breaks } = JSON.parse(response.output_text) as { breaks: number[] };
    return joinAtBreaks(list, breaks);
  } catch (error) {
    console.error("Paragraph breaks failed", error);
    return splitParagraphs(text);
  }
}
