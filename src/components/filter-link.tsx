"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

// A link to the journal list with a filter (a tag, voice notes, a day). On the
// list itself it only changes the URL: the list already holds every entry and
// filters them in place, so switching is instant, with no server request.
// Elsewhere it navigates like any link. New-tab clicks are left to the browser.
export function FilterLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || pathname !== "/") return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        showFilter(String(href));
      }}
      {...props}
    />
  );
}

// Changes the list's URL in place and starts it from the top, as a page would.
export function showFilter(href: string) {
  window.history.pushState(null, "", href);
  window.scrollTo({ top: 0 });
}
