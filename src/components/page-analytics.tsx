"use client";

import { Analytics } from "@vercel/analytics/next";

// Vercel Web Analytics page views. A page's query string can name a diary tag
// ("/?tag=…"), so it is dropped; only the path is recorded.
export function PageAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
