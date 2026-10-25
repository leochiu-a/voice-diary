"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

// Groups this page load's reports in the logs; the module runs once per load.
const load = Math.random().toString(36).slice(2, 8);

// Sends how a page load went, as the phone saw it, to the server logs: when
// the first byte arrived, the first paint (which ends the launch image on the
// home screen), the largest paint, and when React finished hydrating. Each is
// tagged with whether the page was opened from the home screen, which the
// server can't tell from the request.
function send(name: string, value: number) {
  const mode = matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser";
  navigator.sendBeacon("/timing", JSON.stringify({ name, value, mode, load }));
}

// A stable reference, so each metric is reported once.
const report: ReportWebVitalsCallback = (metric) => {
  if (metric.navigationType === "soft-navigation") return;
  if (metric.name === "TTFB" || metric.name === "FCP" || metric.name === "LCP") {
    send(metric.name, metric.value);
  }
};

export function LaunchTiming() {
  useReportWebVitals(report);
  useEffect(() => send("hydrated", performance.now()), []);
  return null;
}
