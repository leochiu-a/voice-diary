import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth";
import { DEFAULT_PROMPTS, normalizePrompts } from "@/lib/prompts";

// The questions the editor reminds the user of while writing; no row yet
// means the defaults.
export const getPrompts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("prompts").select("questions").maybeSingle();
  if (error) throw error;
  return data?.questions ?? DEFAULT_PROMPTS;
});

// Replaces the user's questions; none turns them off.
export const savePrompts = createServerFn({ method: "POST" })
  .validator((input: string[]) => {
    if (!Array.isArray(input) || !input.every((q) => typeof q === "string")) {
      throw new Error("Invalid prompts");
    }
    return normalizePrompts(input);
  })
  .handler(async ({ data: questions }): Promise<{ error?: string }> => {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("prompts")
      .upsert({ questions, updated_at: new Date().toISOString() });
    return error ? { error: error.message } : {};
  });
