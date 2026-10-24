"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { type ReactNode, Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { filterHref, readFilter, type JournalFilter } from "@/lib/journal-filter";
import { Button } from "./ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./ui/input-group";

// The toolbar's search field, ahead of its button group (children). Phones
// have no room for the field, so it folds into a separate glass button and
// drops down under the toolbar, which positions it.
export function SearchToggle({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <div
        id="journal-search"
        className={`${open ? "block" : "hidden"} absolute inset-x-5 top-full mt-1 md:static md:mt-0 md:block md:w-64`}
      >
        {/* The URL is only known at request time; the prerendered shell
            shows the field empty until it is. */}
        <Suspense fallback={<SearchField filter={{ voice: false }} />}>
          <UrlSearchField inputRef={input} />
        </Suspense>
      </div>
      <div className="flex items-center gap-2.5 md:gap-0 md:rounded-full md:glass">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Search entries"
          aria-expanded={open}
          aria-controls="journal-search"
          title="Search entries"
          className="size-12 rounded-full glass md:hidden [&_svg]:size-5"
          onClick={() => {
            setOpen(!open);
            if (!open) requestAnimationFrame(() => input.current?.focus());
          }}
        >
          <SearchIcon />
        </Button>
        {children}
      </div>
    </>
  );
}

function UrlSearchField({ inputRef }: { inputRef: React.Ref<HTMLInputElement> }) {
  return <SearchField filter={readFilter(useSearchParams())} inputRef={inputRef} />;
}

// What's typed goes into
// the URL's q in place, without a history entry per keystroke; while an input
// method is still composing (Zhuyin, Pinyin), the URL waits for the word.
export function SearchField({
  filter,
  inputRef,
}: {
  filter: JournalFilter;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
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
    <InputGroup className="h-12 rounded-full border-0 glass shadow-[0_1px_3px_rgb(0_0_0/0.05)] md:h-9">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
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
