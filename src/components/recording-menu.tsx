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
import { useAppendToBody } from "./entry-body-context";

export function RecordingMenu({
  retryAction,
  deleteAction,
}: {
  retryAction?: () => Promise<{ transcript: string | null }>;
  deleteAction: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const appendToBody = useAppendToBody();
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
                startTransition(async () => {
                  const { transcript } = await retryAction();
                  if (transcript) appendToBody(transcript);
                })
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
