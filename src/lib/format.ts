export function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Today's calendar date ("2026-10-23") in the server's time zone. For
// server-side defaults only; client code uses the browser's date (useToday).
export function currentDate() {
  return new Date().toLocaleDateString("en-CA");
}

// entry_date is a calendar date ("2026-10-19"); format it without a timezone shift.
export function formatEntryDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}
