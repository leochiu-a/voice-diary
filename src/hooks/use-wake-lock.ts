import { useEffect } from "react";

// Keeps the screen on while `active`. A phone that locks its screen suspends
// the page, and with it the microphone and anything listening to it. The
// browser drops the lock whenever the page is hidden, so it is taken again
// each time the page comes back. Where the browser has no Wake Lock API, or
// refuses it (low battery), the screen sleeps as usual.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;

    async function acquire() {
      if (document.visibilityState !== "visible" || sentinel) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) return void next.release();
        sentinel = next;
        next.addEventListener("release", () => {
          if (sentinel === next) sentinel = null;
        });
      } catch {
        // Refused: the screen may sleep.
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release();
    };
  }, [active]);
}
