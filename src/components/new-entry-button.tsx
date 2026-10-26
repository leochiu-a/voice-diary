import { PlusIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

// Opens a draft right away: the id is made here and the row is only written on
// the first save or voice note. Without a date it uses the visitor's local "today".
export function useOpenNewEntry() {
  const navigate = useNavigate();
  return (date = new Date().toLocaleDateString("en-CA")) =>
    navigate({ to: "/entries/$id", params: { id: crypto.randomUUID() }, search: { date } });
}

// "toolbar" is the button in the top bar's group (as in Journal on Mac);
// "floating" is the round thumb-reach button for phones.
export function NewEntryButton({
  variant,
  className,
}: {
  variant: "toolbar" | "floating";
  className?: string;
}) {
  const openNewEntry = useOpenNewEntry();
  const open = () => openNewEntry();

  if (variant === "toolbar") {
    return (
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="New entry"
        title="New entry"
        onClick={open}
        className={cn("size-9.5 rounded-full [&_svg]:size-[18px]", className)}
      >
        <PlusIcon />
      </Button>
    );
  }
  return (
    <Button
      aria-label="New entry"
      onClick={open}
      className={cn("size-14 rounded-full shadow-lg shadow-primary/30 active:scale-95", className)}
    >
      <PlusIcon className="size-6" />
    </Button>
  );
}
