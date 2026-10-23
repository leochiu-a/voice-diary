"use client";

import { format } from "date-fns";
import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

// The visitor's local date ("2026-10-23"). Null during server rendering and
// hydration, so anything keyed on "today" only applies once the browser says so.
export function useToday() {
  return useSyncExternalStore(
    noSubscription,
    () => format(new Date(), "yyyy-MM-dd"),
    () => null,
  );
}
