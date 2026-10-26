import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { useEntryNeighbors } from "@/hooks/use-entry-neighbors";
import { entryQuery } from "@/lib/queries";

// Waits this long after the pages stop moving before taking the one in view.
const SETTLE_MS = 100;

// The open entry's content between the older and newer entries' content, as
// pages of a sideways scroller that snaps to each, under the editor's
// controls, which stay put. Swiping drags the next page in under the finger,
// with the browser's own momentum and bounce, the way Photos pages forward in
// time (left for newer, right for older). Once a neighbour has settled in
// view it becomes the open entry; its page is already drawn from the data
// loaded ahead, so the swap doesn't show. Each page scrolls down on its own.
export function EntryPager({
  id,
  children,
  neighbor,
}: {
  id: string;
  children: ReactNode;
  neighbor: (id: string) => ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { newer, older } = useEntryNeighbors(id);
  const pagerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  // The entries either side load in the background, so their pages show them
  // whole and stepping to one needs no request.
  useEffect(() => {
    for (const page of [newer, older]) {
      if (page) void queryClient.prefetchQuery(entryQuery(page));
    }
  }, [queryClient, newer, older]);

  // The open entry in view, and the others at their tops for when they slide in.
  useLayoutEffect(() => {
    const pager = pagerRef.current;
    const current = currentRef.current;
    if (!pager || !current) return;
    pager.scrollLeft = current.offsetLeft;
    for (const page of pager.children) if (page !== current) page.scrollTop = 0;
  }, [id, newer, older]);

  // Opens the entry whose page the scroller came to rest on. A finger still
  // on the screen may yet pull it back, so that waits for it to lift.
  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    let touching = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function settle() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (touching || !pager) return;
        const page = pager.children[Math.round(pager.scrollLeft / pager.clientWidth)];
        const next = page instanceof HTMLElement ? page.dataset.entry : undefined;
        if (next && next !== id) {
          void navigate({ to: "/entries/$id", params: { id: next }, replace: true });
        }
      }, SETTLE_MS);
    }
    function onTouchStart() {
      touching = true;
    }
    function onTouchEnd(event: TouchEvent) {
      touching = event.touches.length > 0;
      settle();
    }
    pager.addEventListener("scroll", settle, { passive: true });
    pager.addEventListener("touchstart", onTouchStart, { passive: true });
    pager.addEventListener("touchend", onTouchEnd, { passive: true });
    pager.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      clearTimeout(timer);
      pager.removeEventListener("scroll", settle);
      pager.removeEventListener("touchstart", onTouchStart);
      pager.removeEventListener("touchend", onTouchEnd);
      pager.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [id, navigate]);

  return (
    <div ref={pagerRef} className="entry-pager min-h-0 min-w-0 flex-1">
      {[older, id, newer].map(
        (page) =>
          page && (
            <div
              key={page}
              ref={page === id ? currentRef : undefined}
              data-entry={page}
              className="entry-page"
            >
              {page === id ? children : neighbor(page)}
            </div>
          ),
      )}
    </div>
  );
}
