"use client";

import { EllipsisIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { transcribeRecording } from "@/app/(journal)/entries/actions";
import { useVoiceNotes } from "./voice-notes-context";

export function RecordingMenu({
  recordingId,
  busy,
  canRetry,
}: {
  recordingId: string;
  busy: boolean;
  canRetry: boolean;
}) {
  const [acting, startTransition] = useTransition();
  const { transcribe, remove } = useVoiceNotes();
  const pending = acting || busy;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Voice note options"
            disabled={pending}
          />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          {canRetry && (
            <DropdownMenuItem
              onClick={() =>
                startTransition(() =>
                  transcribe(recordingId, () => transcribeRecording(recordingId)),
                )
              }
            >
              <RotateCcwIcon />
              Add Text to Entry
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => remove(recordingId)}>
            <Trash2Icon />
            Delete Voice Note
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
