import { useQuery } from "@tanstack/react-query";
import { MessageCircleQuestionIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { MAX_PROMPTS, MAX_PROMPT_LENGTH, normalizePrompts } from "@/lib/prompts";
import { promptsQuery, useRefresh } from "@/lib/queries";
import { savePrompts } from "@/server/prompts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const SECTIONS = [{ id: "prompts", label: "Prompts", icon: MessageCircleQuestionIcon }] as const;

// Settings as one dialog, sections listed down its side, as in the Claude and
// Linear apps. Opened from the account menu, or from the part of the page a
// section is about (see EntryPrompts).
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("prompts");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogTitle className="border-b px-4 py-3.5 text-base">Settings</DialogTitle>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav className="flex gap-1 border-b p-2 md:w-48 md:flex-col md:border-r md:border-b-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={section === id ? "page" : undefined}
                onClick={() => setSection(id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  section === id && "bg-muted font-medium",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            {section === "prompts" && <PromptsSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PromptsSettings() {
  const { data: prompts } = useQuery(promptsQuery);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">Prompts</h2>
        <p className="text-sm text-muted-foreground">
          Questions shown while you write, as reminders of what to say more about.
        </p>
      </div>
      {prompts ? <PromptList initial={prompts} /> : <Skeleton className="h-40 rounded-xl" />}
    </section>
  );
}

// One row per question, edited in place, like a list in Reminders. Each
// change saves on its own; one the server refuses is undone.
function PromptList({ initial }: { initial: string[] }) {
  const refresh = useRefresh();
  const [prompts, setPrompts] = useState(initial);
  const [error, setError] = useState<string>();

  async function save(next: string[]) {
    const previous = prompts;
    const questions = normalizePrompts(next);
    setPrompts(questions);
    setError(undefined);
    const result = await savePrompts({ data: questions }).catch(() => ({ error: "offline" }));
    if (result.error) {
      setPrompts(previous);
      setError("Couldn't save the prompts. Try again.");
    } else refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-muted/30">
        {prompts.map((prompt, i) => (
          <li key={prompt} className="group flex items-center gap-1 pr-1.5">
            <PromptInput
              aria-label={`Prompt ${i + 1}`}
              defaultValue={prompt}
              onCommit={(value) => {
                if (value.trim() === prompt) return;
                void save(prompts.map((p, j) => (j === i ? value : p)));
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete “${prompt}”`}
              onClick={() => void save(prompts.filter((_, j) => j !== i))}
              className="text-muted-foreground md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
            >
              <XIcon />
            </Button>
          </li>
        ))}
        {prompts.length < MAX_PROMPTS && (
          <li className="flex items-center gap-2 pl-3 text-muted-foreground">
            <PlusIcon className="size-4 shrink-0" aria-hidden />
            <PromptInput
              // Empty again once a prompt is added.
              key={prompts.length}
              aria-label="New prompt"
              placeholder="Add a prompt"
              className="pl-0"
              onCommit={(value) => {
                if (value.trim()) void save([...prompts, value]);
              }}
            />
          </li>
        )}
      </ul>
      <p className="text-xs text-muted-foreground">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          `${prompts.length} of ${MAX_PROMPTS}`
        )}
      </p>
    </div>
  );
}

// Commits on Enter or on leaving the field; Escape puts back what was there.
function PromptInput({
  onCommit,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "onBlur" | "onKeyDown"> & {
  onCommit: (value: string) => void;
}) {
  return (
    <input
      type="text"
      maxLength={MAX_PROMPT_LENGTH}
      enterKeyHint="done"
      onBlur={(event) => onCommit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.stopPropagation();
          event.currentTarget.value = String(props.defaultValue ?? "");
          event.currentTarget.blur();
        }
      }}
      className={cn(
        "min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground/70",
        className,
      )}
      {...props}
    />
  );
}
