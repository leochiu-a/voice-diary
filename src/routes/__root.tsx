import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LaunchTiming } from "@/components/launch-timing";
import { PageSpeedInsights } from "@/components/page-speed-insights";
import { calendarPanelScript } from "@/lib/calendar-panel";
import { firstPaintScript } from "@/lib/first-paint";
import { startupLinks } from "@/lib/startup-images";
import css from "../globals.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Voice Diary" },
      { name: "description", content: "A private diary for your journey, written or spoken." },
      // Tints the browser and status bars to match the page background. The
      // color scheme lets the browser paint a dark canvas in dark mode before
      // the styles load, instead of flashing white on open.
      { name: "color-scheme", content: "light dark" },
      { name: "theme-color", media: "(prefers-color-scheme: light)", content: "#f5f4f7" },
      { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#000000" },
      // Added to the home screen, it opens full screen like an app, showing a
      // launch image until the page first paints. iOS only shows launch images
      // for pages that also carry its own older name for "capable".
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Voice Diary" },
    ],
    links: [
      { rel: "stylesheet", href: css },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon", type: "image/png", sizes: "64x64" },
      { rel: "apple-touch-icon", href: "/apple-icon", sizes: "180x180" },
      ...startupLinks.map(({ url, media }) => ({
        rel: "apple-touch-startup-image",
        href: url,
        media,
      })),
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // The inline scripts set data-calendar and data-booting before React hydrates.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: calendarPanelScript }} />
        <script dangerouslySetInnerHTML={{ __html: firstPaintScript }} />
        <HeadContent />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <PageSpeedInsights />
        <LaunchTiming />
        <Scripts />
      </body>
    </html>
  );
}
