"use client";

import { AudioLinesIcon, ChevronRightIcon, SearchIcon, TagIcon, XIcon } from "lucide-react";
import { type ReactNode, Suspense, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "next/navigation";
import { filterHref, readFilter, type JournalFilter } from "@/lib/journal-filter";
import { FilterLink } from "./filter-link";
import { Button } from "./ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./ui/input-group";

// What the search screen offers to filter by before anything is typed.
export type SearchFilters = { voiceNotes: number; tags: [name: string, count: number][] };

// The toolbar's search field, ahead of its button group (children). Phones
// have no room for the field: its button opens a search screen over the list,
// as Journey and Day One do, with every filter laid out until something is
// typed. Then the list beneath shows the results.
export function SearchToggle({
  filters,
  children,
}: {
  filters?: SearchFilters;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    const filter = readFilter(new URLSearchParams(window.location.search));
    if (filter.q) window.history.replaceState(null, "", filterHref({ ...filter, q: undefined }));
  }

  return (
    <>
      <div className="hidden md:block md:w-72">
        {/* The URL is only known at request time; the prerendered shell
            shows the field empty until it is. */}
        <Suspense fallback={<SearchField filter={{ voice: false }} />}>
          <UrlSearchField />
        </Suspense>
      </div>
      {/* Mounted while closed, so opening can focus the field within the tap,
          which iOS requires before it shows the keyboard. */}
      <dialog
        id="journal-search"
        open={open}
        aria-label="Search"
        className="pointer-events-none fixed inset-0 z-30 m-0 hidden size-full max-h-none max-w-none flex-col border-0 bg-transparent p-0 text-foreground open:flex md:open:hidden"
      >
        <Suspense fallback={null}>
          <SearchScreen filters={filters} inputRef={input} onClose={close} />
        </Suspense>
      </dialog>
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
            flushSync(() => setOpen(true));
            input.current?.focus();
          }}
        >
          <SearchIcon />
        </Button>
        {children}
      </div>
    </>
  );
}

function UrlSearchField() {
  return <SearchField filter={readFilter(useSearchParams())} />;
}

function SearchScreen({
  filters,
  inputRef,
  onClose,
}: {
  filters?: SearchFilters;
  inputRef: React.Ref<HTMLInputElement>;
  onClose: () => void;
}) {
  const filter = readFilter(useSearchParams());
  return (
    <>
      <div className="pointer-events-auto flex items-center gap-2.5 bg-background px-5 py-3">
        <div className="flex-1">
          <SearchField filter={filter} inputRef={inputRef} />
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Close search"
          title="Close search"
          className="size-12 shrink-0 rounded-full glass [&_svg]:size-5"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>
      {!filter.q?.trim() && filters && (
        <div className="pointer-events-auto flex-1 overflow-y-auto overscroll-contain bg-background px-5 pb-10">
          {filters.voiceNotes > 0 && (
            <FilterGroup label="Filters">
              <FilterRow
                href={filterHref({ voice: true })}
                icon={<AudioLinesIcon />}
                label="Voice Notes"
                count={filters.voiceNotes}
                onClick={onClose}
              />
            </FilterGroup>
          )}
          {filters.tags.length > 0 && (
            <FilterGroup label="Tags">
              {filters.tags.map(([name, count]) => (
                <FilterRow
                  key={name}
                  href={filterHref({ tag: name, voice: false })}
                  icon={<TagIcon />}
                  label={name}
                  count={count}
                  onClick={onClose}
                />
              ))}
            </FilterGroup>
          )}
        </div>
      )}
    </>
  );
}

// A grouped list, as in iOS Settings: a small heading over one rounded card.
function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="px-1 pb-2 text-[13px] font-semibold text-muted-foreground">{label}</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">{children}</ul>
    </section>
  );
}

function FilterRow({
  href,
  icon,
  label,
  count,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <li>
      <FilterLink
        href={href}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3.5 text-[17px] active:bg-muted [&>svg:first-child]:size-5 [&>svg:first-child]:text-primary"
      >
        {icon}
        <span className="flex-1 truncate">{label}</span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[15px] text-muted-foreground tabular-nums">
          {count}
        </span>
        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
      </FilterLink>
    </li>
  );
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
    <InputGroup className="h-12 rounded-full border-0 glass shadow-[0_1px_3px_rgb(0_0_0/0.05)] md:h-10 md:[&_svg]:size-[18px]">
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
