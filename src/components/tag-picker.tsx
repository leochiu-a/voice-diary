import { PlusIcon, TagIcon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useRefresh } from "@/lib/queries";
import { saveEntryTags } from "@/server/entries";
import { cleanTag, normalizeTags } from "@/lib/tags";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Tag chips plus a "Tag" button that opens a searchable checklist, the way
// labels work in Linear or GitHub. Every change is saved right away.
export function TagPicker({
  entryId,
  entryDate,
  defaultTags,
  suggestions,
}: {
  entryId: string;
  entryDate: string;
  defaultTags: string[];
  suggestions: string[];
}) {
  const [tags, setTags] = useState(defaultTags);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const refresh = useRefresh();

  function update(next: string[]) {
    const normalized = normalizeTags(next);
    setTags(normalized);
    startTransition(async () => {
      const result = await saveEntryTags({ data: { entryId, entryDate, tags: normalized } });
      setError(result.error);
      if (!result.error) refresh();
    });
  }

  const has = (tag: string) => tags.some((t) => t.toLowerCase() === tag.toLowerCase());
  const toggle = (tag: string) => update(has(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);

  // Tags on this entry first, then the rest the user has used before.
  const options = [...tags, ...suggestions.filter((tag) => !has(tag))];
  const typed = cleanTag(query);
  const canCreate =
    typed !== "" && !options.some((tag) => tag.toLowerCase() === typed.toLowerCase());

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex h-7 items-center gap-1 rounded-full bg-primary/10 pr-1 pl-2.5 text-[13px] font-medium text-primary"
        >
          <TagIcon className="size-3.5" aria-hidden />
          {tag}
          <button
            type="button"
            onClick={() => update(tags.filter((t) => t !== tag))}
            aria-label={`Remove tag ${tag}`}
            className="flex size-5 items-center justify-center rounded-full opacity-60 hover:bg-primary/15 hover:opacity-100"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}

      <Popover onOpenChange={(open) => !open && setQuery("")}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-full text-muted-foreground"
            />
          }
        >
          <PlusIcon data-icon="inline-start" />
          Tag
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-0">
          <Command>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search or create a tag"
            />
            <CommandList>
              {options.length > 0 && (
                <CommandGroup>
                  {options.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      data-checked={has(tag)}
                      onSelect={() => toggle(tag)}
                    >
                      <TagIcon className="text-primary" aria-hidden />
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {canCreate && (
                // forceMount on both: cmdk would otherwise filter "Create" against the search.
                <CommandGroup forceMount>
                  <CommandItem
                    forceMount
                    value={`create ${typed}`}
                    onSelect={() => {
                      update([...tags, typed]);
                      setQuery("");
                    }}
                  >
                    <PlusIcon aria-hidden />
                    Create “{typed}”
                  </CommandItem>
                </CommandGroup>
              )}
              {!canCreate && options.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Type a name to create a tag
                </p>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
