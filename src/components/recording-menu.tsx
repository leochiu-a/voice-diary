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
import { useTranscription } from "./transcription-context";

export function RecordingMenu({
  recordingId,
  retryAction,
  deleteAction,
}: {
  recordingId: string;
  retryAction?: () => Promise<{ transcript: string | null }>;
  deleteAction: () => Promise<void>;
}) {
  const [acting, startTransition] = useTransition();
  const { transcribing, transcribe } = useTranscription();
  const pending = acting || transcribing.has(recordingId);
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
          {retryAction && (
            <DropdownMenuItem
              onClick={() =>
                startTransition(() =>
                  transcribe(recordingId, async () => (await retryAction()).transcript),
                )
              }
            >
              <RotateCcwIcon />
              Add Text to Entry
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => startTransition(deleteAction)}>
            <Trash2Icon />
            Delete Voice Note
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
