import "@tanstack/react-start/server-only";
import { parseEmailList } from "@/lib/allowlist";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabasePublishableKey() {
    return required("SUPABASE_PUBLISHABLE_KEY");
  },
  // Read only when a voice note is transcribed. Without it a voice note is
  // still saved, its transcription marked failed, ready to retry.
  get openaiApiKey() {
    return required("OPENAI_API_KEY");
  },
  get allowedEmails() {
    return parseEmailList(required("ALLOWED_EMAILS"));
  },
};
