"use client";

import { differenceInCalendarMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ArrowUpIcon, CalendarDaysIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToday } from "@/hooks/use-today";

const STORAGE_KEY = "calendar-panel";
const LARGE_QUERY = "(min-width: 1024px)";
const MAX_DOTS = 3;
// Months rendered at first, and added each time the list nears its end.
const MONTHS_PER_PAGE = 12;

// Whether the docked panel is shown on wide screens; remembered per browser.
const panelStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(STORAGE_KEY, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(STORAGE_KEY, onChange);
    };
  },
  get() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "closed";
    } catch {
      return true;
    }
  },
  set(open: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, open ? "open" : "closed");
    } catch {}
    window.dispatchEvent(new Event(STORAGE_KEY));
  },
};

function subscribeLarge(onChange: () => void) {
  const query = window.matchMedia(LARGE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

type PanelState = {
  docked: boolean;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  toggle: () => void;
};
const PanelContext = createContext<PanelState | null>(null);

// Shares the panel's open state between the toolbar toggle and the panel itself.
// Wide screens dock the panel beside the list; narrow ones slide it in as a sheet.
export function CalendarPanelProvider({ children }: { children: ReactNode }) {
  const docked = useSyncExternalStore(panelStore.subscribe, panelStore.get, () => true);
  const isLarge = useSyncExternalStore(
    subscribeLarge,
    () => window.matchMedia(LARGE_QUERY).matches,
    () => true,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const toggle = () => (isLarge ? panelStore.set(!docked) : setSheetOpen(true));
  return (
    <PanelContext value={{ docked, sheetOpen, setSheetOpen, toggle }}>{children}</PanelContext>
  );
}

function usePanel() {
  const panel = use(PanelContext);
  if (!panel) throw new Error("Calendar panel parts must be inside CalendarPanelProvider");
  return panel;
}

export function CalendarPanelToggle() {
  const { docked, toggle } = usePanel();
  return (
    <Button
      variant="glass"
      size="icon-lg"
      aria-label="Calendar"
      aria-expanded={docked}
      title="Calendar"
      onClick={toggle}
      className={cn(docked && "lg:bg-primary/15 lg:text-primary")}
    >
      <CalendarDaysIcon />
    </Button>
  );
}

export type CalendarEntry = { date: string; tags: string[]; voice: boolean };

type CalendarData = {
  // Calendar date ("2026-10-23") → number of entries that day.
  counts: Record<string, number>;
  // The date the list is filtered to, if any.
  day?: string;
  // The server's current month ("2026-10"), used until the browser's is known.
  thisMonth: string;
};

// Lives in the (journal) layout so its scroll position survives navigation; it
// only shows on the list page. Counts follow the list's current filter.
export function CalendarPanel({
  entries,
  thisMonth,
}: {
  entries: CalendarEntry[];
  thisMonth: string;
}) {
  const { docked, sheetOpen, setSheetOpen, toggle } = usePanel();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pathname !== "/") return null;

  const tag = searchParams.get("tag");
  const voiceOnly = searchParams.get("filter") === "voice";
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    if (tag ? !entry.tags.includes(tag) : voiceOnly && !entry.voice) continue;
    counts[entry.date] = (counts[entry.date] ?? 0) + 1;
  }
  const data: CalendarData = { counts, day: searchParams.get("day") ?? undefined, thisMonth };

  return (
    <>
      {/* Always mounted so opening and closing can animate. The column grows to
          make room while the window inside slides and fades in, inset from the
          screen edges like a floating panel. */}
      <aside
        aria-label="Calendar"
        inert={!docked}
        data-open={docked}
        className="group/panel sticky top-0 hidden h-svh w-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[open=true]:w-[332px] motion-reduce:transition-none lg:block"
      >
        <div className="flex h-full w-[332px] py-3 pr-3">
          <section className="flex w-80 translate-x-4 flex-col overflow-hidden rounded-2xl border bg-card opacity-0 shadow-xl shadow-black/10 transition-[translate,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[open=true]/panel:translate-x-0 group-data-[open=true]/panel:opacity-100 motion-reduce:transition-none">
            <header className="flex h-12 shrink-0 items-center justify-between border-b pr-2 pl-4">
              <h2 className="text-sm font-semibold">Calendar</h2>
              <Button variant="ghost" size="icon-sm" aria-label="Close calendar" onClick={toggle}>
                <XIcon />
              </Button>
            </header>
            <MonthList {...data} />
          </section>
        </div>
      </aside>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-80 gap-0 bg-card lg:hidden">
          <SheetHeader>
            <SheetTitle>Calendar</SheetTitle>
          </SheetHeader>
          <MonthList {...data} onPick={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

const CountsContext = createContext<Record<string, number>>({});

// Months stacked newest first, going back in time as you scroll down, like the
// journal list beside it. It starts at the current month (a diary has no future)
// and loads older months as the end comes into view. Picking a day filters the
// list to it; picking it again clears it.
function MonthList({ counts, day, thisMonth, onPick }: CalendarData & { onPick?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = useToday();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const selected = day ? parseISO(day) : undefined;
  const lastMonth = startOfMonth(parseISO(today ?? `${thisMonth}-01`));
  // Enough months to reach the selected day, plus a page of older ones.
  // `firstMonth` is the oldest; the calendar lists them in reverse.
  const [monthCount, setMonthCount] = useState(
    () =>
      (selected ? Math.max(0, differenceInCalendarMonths(lastMonth, selected)) : 0) +
      MONTHS_PER_PAGE,
  );
  const firstMonth = subMonths(lastMonth, monthCount - 1);

  // The current month is already at the top; scroll down to a selected day's month.
  useEffect(() => {
    if (!selected) return;
    const target = format(selected, "MMMM yyyy");
    // The grid is labelled with its month; its parent is the whole month, caption included.
    const grid = scrollRef.current?.querySelector(`[role="grid"][aria-label="${target}"]`);
    grid?.parentElement?.scrollIntoView({ block: "start" });
    // Only when the panel first renders; later picks keep the scroll position.
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);

  // Offer a way back once today's cell scrolls out of view.
  const [todayHidden, setTodayHidden] = useState(false);
  useEffect(() => {
    const root = scrollRef.current;
    const todayCell = root?.querySelector('[data-today="true"]');
    if (!root || !todayCell) return;
    const observer = new IntersectionObserver(([entry]) => setTodayHidden(!entry.isIntersecting), {
      root,
    });
    observer.observe(todayCell);
    return () => observer.disconnect();
  }, []);

  function scrollToToday() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  // Near the end, append another page of older months. They go below what is
  // on screen, so nothing in view moves.
  useEffect(() => {
    const root = scrollRef.current;
    const end = endRef.current;
    if (!root || !end) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setMonthCount((count) => count + MONTHS_PER_PAGE);
      },
      { root, rootMargin: "0px 0px 600px 0px" },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  function pick(date: Date | undefined) {
    const params = new URLSearchParams(searchParams);
    if (date) params.set("day", format(date, "yyyy-MM-dd"));
    else params.delete("day");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    onPick?.();
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8"
      >
        <CountsContext value={counts}>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={pick}
            month={firstMonth}
            numberOfMonths={monthCount}
            reverseMonths
            disabled={today ? { after: parseISO(today) } : undefined}
            hideNavigation
            showOutsideDays={false}
            // Cells are a minimum width: 7 of them plus the 6 gaps must fit the
            // panel's 288px content box, or the week row runs past its right edge.
            className="w-full bg-transparent p-0 [--cell-radius:0.625rem] [--cell-size:--spacing(9)]"
            classNames={{
              root: "w-full",
              months: "flex flex-col gap-6",
              month: "flex w-full flex-col gap-2",
              // Each month's name stays pinned while its days scroll under it.
              month_caption:
                "sticky top-0 z-20 -mx-4 flex h-12 items-end bg-card/90 px-4 pb-1.5 backdrop-blur-md",
              caption_label: "text-[15px] font-semibold",
              // A small gap keeps a hovered day off its neighbour's ring or tint.
              weekdays: "flex gap-1",
              weekday: "flex-1 text-xs text-muted-foreground",
              week: "mt-1 flex w-full gap-1",
              // Today gets a ring instead of the default fill, which clashes with the entry tint.
              today: "[&>button]:ring-1 [&>button]:ring-primary [&>button]:ring-inset",
            }}
            components={{ DayButton: EntryDayButton }}
          />
        </CountsContext>
        <div ref={endRef} aria-hidden />
      </div>
      {/* Today's month is at the top, so "back to today" scrolls there. */}
      <Button
        variant="glass"
        size="sm"
        onClick={scrollToToday}
        inert={!todayHidden}
        data-shown={todayHidden}
        className="absolute bottom-5 left-1/2 z-30 h-8 -translate-x-1/2 translate-y-2 rounded-full px-3.5 opacity-0 transition-[opacity,translate] duration-200 data-[shown=true]:translate-y-0 data-[shown=true]:opacity-100 motion-reduce:transition-none"
      >
        <ArrowUpIcon data-icon="inline-start" />
        Today
      </Button>
    </div>
  );
}

// A day tinted when it has entries, with up to three dots for how many.
function EntryDayButton({ children, ...props }: ComponentProps<typeof CalendarDayButton>) {
  const counts = use(CountsContext);
  const count = counts[format(props.day.date, "yyyy-MM-dd")] ?? 0;
  return (
    <CalendarDayButton
      {...props}
      className={cn(
        // Hover deepens the tint instead of the ghost button's gray, which erased it.
        count > 0 &&
          "bg-primary/12 font-semibold text-primary hover:bg-primary/20 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary",
        // The picked day stays solid on hover too.
        "data-[selected-single=true]:hover:bg-primary data-[selected-single=true]:hover:text-primary-foreground dark:data-[selected-single=true]:hover:bg-primary dark:data-[selected-single=true]:hover:text-primary-foreground",
      )}
    >
      {children}
      <span aria-hidden className="flex h-1 gap-0.5">
        {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, i) => (
          <span key={i} className="size-1 rounded-full bg-current" />
        ))}
      </span>
      {count > 0 && <span className="sr-only">{count === 1 ? "1 entry" : `${count} entries`}</span>}
    </CalendarDayButton>
  );
}
