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

export function RecordingMenu({
  retryAction,
  deleteAction,
}: {
  retryAction?: () => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
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
            <DropdownMenuItem onClick={() => startTransition(retryAction)}>
              <RotateCcwIcon />
              Retry Transcription
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
