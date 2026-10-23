"use client";

import { PenLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useOpenNewEntry } from "./new-entry-button";

// Shown when the calendar's picked day has no entries: offers to write one for it.
export function DayEmptyState({ day }: { day: string }) {
  const openNewEntry = useOpenNewEntry();
  return (
    <Empty className="mt-8 rounded-2xl bg-card">
      <EmptyHeader>
        <EmptyTitle>Nothing written this day</EmptyTitle>
        <EmptyDescription>Add an entry dated to it, written or spoken.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => openNewEntry(day)}>
          <PenLineIcon data-icon="inline-start" />
          Write for this day
        </Button>
      </EmptyContent>
    </Empty>
  );
}
