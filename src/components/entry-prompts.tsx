import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, MessageCircleQuestionIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { promptsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SettingsDialog } from "./settings-dialog";

// Questions above the text while writing, reminders of what to say more
// about, like the prompts in Day One or Apple's Journal. The user writes their
// own in Settings; with none, nothing shows.
export function EntryPrompts() {
  const { data: prompts } = useQuery(promptsQuery);
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (!prompts?.length) return null;

  return (
    <>
      <Collapsible
        defaultOpen
        className="rounded-2xl bg-muted/60 px-3.5 py-2.5 text-[15px] leading-relaxed"
      >
        <div className="flex items-center gap-2">
          <CollapsibleTrigger className="group flex flex-1 items-center gap-2 py-1 text-left text-[13px] font-medium text-muted-foreground outline-none focus-visible:underline">
            <MessageCircleQuestionIcon className="size-4" aria-hidden />
            Say more about
            <ChevronDownIcon
              className="size-4 transition-transform group-data-[panel-open]:rotate-180"
              aria-hidden
            />
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit prompts"
            title="Edit prompts"
            onClick={() => setSettingsOpen(true)}
            className="text-muted-foreground"
          >
            <PencilIcon />
          </Button>
        </div>
        <CollapsibleContent>
          <ul className="mt-1 flex list-disc flex-col gap-1 pb-1 pl-5 marker:text-muted-foreground/60">
            {prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
