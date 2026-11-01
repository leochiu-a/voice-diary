import "@tanstack/react-start/server-only";
import OpenAI from "openai";
import { env } from "@/lib/env";

let client: OpenAI | undefined;

export function openai() {
  client ??= new OpenAI({ apiKey: env.openaiApiKey });
  return client;
}
