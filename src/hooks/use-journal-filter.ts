import { useNavigate, useSearch } from "@tanstack/react-router";
import { type JournalFilter, filterSearch, readFilter } from "@/lib/journal-filter";

// The journal list's filter, from the current URL. The sidebar and calendar
// sit in the layout, so they read it whichever page is showing.
export function useJournalFilter() {
  return readFilter(useSearch({ strict: false }));
}

// Shows the list with another filter. The list already holds every entry and
// filters them in place, so this loads nothing. `replace` edits the current
// history entry in place, as typing a search does.
export function useShowFilter() {
  const navigate = useNavigate();
  return (filter: JournalFilter, { replace = false } = {}) =>
    navigate({ to: "/", search: filterSearch(filter), replace, resetScroll: !replace });
}
