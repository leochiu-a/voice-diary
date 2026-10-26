import { useSyncExternalStore } from "react";

// Whether a media query matches, following changes. The server renders as if it
// doesn't, so use it for what happens after the page is interactive, not for
// what the first paint shows.
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
