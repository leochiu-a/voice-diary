"use client";

import { createContext, use } from "react";

// Lets voice-note controls add their transcript to the body the editor is
// showing, matching what the server just appended to the saved entry. Without
// it the editor would keep its older text and overwrite the transcript on save.
export const EntryBodyContext = createContext<((text: string) => void) | null>(null);

export function useAppendToBody() {
  const append = use(EntryBodyContext);
  if (!append) throw new Error("useAppendToBody must be used inside EntryEditor");
  return append;
}
