"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { filterHref, type JournalFilter } from "@/lib/journal-filter";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./ui/input-group";

// The list's search field, under the title like iOS's. What's typed goes into
// the URL's q in place, without a history entry per keystroke; while an input
// method is still composing (Zhuyin, Pinyin), the URL waits for the word.
export function SearchField({ filter }: { filter: JournalFilter }) {
  const [value, setValue] = useState(filter.q ?? "");
  // A link elsewhere (a tag, the sidebar) can drop q; the field follows it.
  const [shownQ, setShownQ] = useState(filter.q);
  if (filter.q !== shownQ) {
    setShownQ(filter.q);
    if (filter.q !== (value || undefined)) setValue(filter.q ?? "");
  }

  function search(q: string) {
    setValue(q);
    setShownQ(q || undefined);
    window.history.replaceState(null, "", filterHref({ ...filter, q: q || undefined }));
  }

  return (
    <InputGroup className="h-9 rounded-xl border-0 bg-card shadow-[0_1px_3px_rgb(0_0_0/0.05)]">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        enterKeyHint="search"
        placeholder="Search"
        aria-label="Search entries"
        value={value}
        onChange={(event) => {
          if ((event.nativeEvent as InputEvent).isComposing) setValue(event.target.value);
          else search(event.target.value);
        }}
        onCompositionEnd={(event) => search(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") search("");
        }}
        className="text-[15px] [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => search("")}>
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
