// Whether the docked calendar panel is shown is remembered per browser. The
// server can't know it, so the root layout runs this script before the first
// paint: it copies the saved choice onto <html>, where the panel's CSS reads
// it. Otherwise a closed panel would paint open first.
export const CALENDAR_PANEL_KEY = "calendar-panel";

export const calendarPanelScript = `try{document.documentElement.dataset.calendar=localStorage.getItem(${JSON.stringify(CALENDAR_PANEL_KEY)})==="closed"?"closed":"open"}catch(e){}`;
