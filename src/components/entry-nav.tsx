import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useHorizontalSwipe } from "@/hooks/use-horizontal-swipe";
import { journalQuery } from "@/lib/queries";
import { Button } from "./ui/button";

// Steps to the newer or older entry in the journal's order, as Mail's up and
// down arrows step through a mailbox. A draft not yet in the journal has none.
// On a touch screen a sideways swipe does the same, turning pages forward in
// time as in Photos: swipe left for the newer entry, right for the older one.
export function EntryNav({ id }: { id: string }) {
  const navigate = useNavigate();
  const entries = useQuery(journalQuery).data?.entries;
  const index = entries?.findIndex((entry) => entry.id === id) ?? -1;
  const newer = index > 0 ? entries?.[index - 1]?.id : undefined;
  const older = index >= 0 ? entries?.[index + 1]?.id : undefined;

  useHorizontalSwipe((direction) => {
    const next = direction === "left" ? newer : older;
    if (!next) return;
    void navigate({
      to: "/entries/$id",
      params: { id: next },
      replace: true,
      viewTransition: { types: [`swipe-${direction}`] },
    });
  });

  if (index === -1) return null;
  return (
    <div className="flex items-center gap-2">
      <NavButton id={newer} label="Newer entry" icon={<ChevronUpIcon />} />
      <NavButton id={older} label="Older entry" icon={<ChevronDownIcon />} />
    </div>
  );
}

function NavButton({ id, label, icon }: { id?: string; label: string; icon: ReactNode }) {
  const className = "size-12 md:size-9";
  if (!id) {
    return (
      <Button variant="glass" size="icon-lg" aria-label={label} disabled className={className}>
        {icon}
      </Button>
    );
  }
  return (
    <Button
      variant="glass"
      size="icon-lg"
      nativeButton={false}
      render={<Link to="/entries/$id" params={{ id }} replace aria-label={label} />}
      className={className}
    >
      {icon}
    </Button>
  );
}
