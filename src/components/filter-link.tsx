import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { type JournalFilter, filterSearch } from "@/lib/journal-filter";

// A link to the journal list with a filter (a tag, voice notes, a day). The
// list already holds every entry and filters them in place, so following it
// from the list loads nothing; it starts the list from the top, as a page would.
export function FilterLink({
  filter,
  ...props
}: Omit<ComponentProps<"a">, "href"> & { filter: JournalFilter }) {
  return <Link to="/" search={filterSearch(filter)} {...props} />;
}
