"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "cn";
import { FilterLink } from "./filter-link";

export type SidebarNavItem = {
  key: string;
  href: string;
  label: string;
  count: number;
  icon: ReactNode;
};

// The sidebar sits in a layout, which doesn't re-render per page, so the
// highlighted item is worked out here from the current URL.
export function SidebarNav({ label, items }: { label: string; items: SidebarNavItem[] }) {
  const active = useActiveKey();
  return (
    <nav aria-label={label} className="flex flex-col gap-0.5">
      <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {items.map((item) => (
        <FilterLink
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent/60 [&_svg]:size-4 [&_svg]:text-sidebar-primary",
            active === item.key &&
              "bg-sidebar-primary font-medium text-sidebar-primary-foreground hover:bg-sidebar-primary [&_svg]:text-sidebar-primary-foreground [&>span:last-child]:text-sidebar-primary-foreground",
          )}
        >
          {item.icon}
          <span className="flex-1 truncate">{item.label}</span>
          <span className="text-muted-foreground tabular-nums">{item.count}</span>
        </FilterLink>
      ))}
    </nav>
  );
}

// Keys: "all", "voice", or "tag:<name>" on the list page; none elsewhere.
function useActiveKey() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pathname !== "/") return undefined;
  const tag = searchParams.get("tag");
  if (tag) return `tag:${tag}`;
  return searchParams.get("filter") === "voice" ? "voice" : "all";
}
