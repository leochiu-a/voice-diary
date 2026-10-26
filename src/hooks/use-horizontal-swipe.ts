import { useEffect, useEffectEvent } from "react";

export type SwipeDirection = "left" | "right";

// The finger must travel this far, mostly sideways, and quickly, so a scroll
// or a slow drag isn't taken for a swipe.
const MIN_DISTANCE = 60;
const MAX_DURATION_MS = 500;
// Swipes from the screen's edges belong to the browser (back and forward).
const EDGE = 24;

// Calls onSwipe when a finger flicks sideways across the page. Ignored while
// typing, selecting text, or when it starts on a control that drags sideways
// itself (an audio slider) or inside a dialog or menu.
export function useHorizontalSwipe(onSwipe: (direction: SwipeDirection) => void) {
  const swiped = useEffectEvent(onSwipe);

  useEffect(() => {
    let start: { x: number; y: number; time: number } | undefined;

    function onStart(event: TouchEvent) {
      start = undefined;
      const touch = event.touches[0];
      if (event.touches.length !== 1 || !swipeable(event.target)) return;
      if (touch.clientX < EDGE || touch.clientX > window.innerWidth - EDGE) return;
      start = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }

    function onEnd(event: TouchEvent) {
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const quick = Date.now() - start.time <= MAX_DURATION_MS;
      start = undefined;
      if (!quick || Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < 2 * Math.abs(dy)) return;
      if (!window.getSelection()?.isCollapsed) return;
      swiped(dx < 0 ? "left" : "right");
    }

    function onCancel() {
      start = undefined;
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, []);
}

function swipeable(target: EventTarget | null) {
  const active = document.activeElement;
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return false;
  return !(
    target instanceof Element &&
    target.closest(
      'input, [data-slot="slider"], [role="dialog"], [role="alertdialog"], [role="menu"]',
    )
  );
}
