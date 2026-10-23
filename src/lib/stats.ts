type StatsEntry = { entry_date: string; recordings: { duration_ms: number | null }[] };

// Numbers for the Insights card, derived from the entries the page already loaded.
export function journalStats(entries: StatsEntry[]) {
  const recordings = entries.flatMap((entry) => entry.recordings);
  return {
    entries: entries.length,
    daysJournaled: new Set(entries.map((entry) => entry.entry_date)).size,
    voiceNotes: recordings.length,
    minutesSpoken: Math.round(recordings.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / 60_000),
    withVoice: entries.filter((entry) => entry.recordings.length > 0).length,
  };
}

export type JournalStats = ReturnType<typeof journalStats>;
