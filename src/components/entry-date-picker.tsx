import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToday } from "@/hooks/use-today";

// The entry's date as a button that opens a calendar. `value` is a calendar
// date ("2026-10-23"); it is submitted with the form as `entry_date`.
export function EntryDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = useToday();
  const selected = parseISO(value);
  const label = format(selected, "EEEE, MMMM d, yyyy");

  function pick(date: Date | undefined) {
    if (!date) return;
    onChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`Entry date: ${label}`}
              className="-mx-1.5 flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
            />
          }
        >
          {label}
          <CalendarIcon className="size-3.5" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={pick}
            disabled={today ? { after: parseISO(today) } : undefined}
            required
          />
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => pick(new Date())}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <input type="hidden" name="entry_date" value={value} />
    </>
  );
}
