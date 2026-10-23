"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

// Vercel Speed Insights: Core Web Vitals (LCP, INP, CLS…) from real visits.
// A page's query string can name a diary tag ("/?tag=…"), so it is dropped;
// only the path is recorded.
export function PageSpeedInsights() {
  return (
    <SpeedInsights
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
