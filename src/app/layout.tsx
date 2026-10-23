import type { Metadata, Viewport } from "next";
import { PageSpeedInsights } from "@/components/page-speed-insights";
import { calendarPanelScript } from "@/lib/calendar-panel";
import { firstPaintScript } from "@/lib/first-paint";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Diary",
  description: "A private diary for your journey, written or spoken.",
  // Added to the home screen, it opens full screen like an app. It has no
  // launch image on purpose: iOS cross-fades one into the page, which flashes.
  appleWebApp: { capable: true, title: "Voice Diary" },
};

// Tints the browser and status bars to match the page background. The color
// scheme lets the browser paint a dark canvas in dark mode before the styles
// load, instead of flashing white on open.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline scripts set data-calendar and data-booting before React hydrates.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: calendarPanelScript }} />
        <script dangerouslySetInnerHTML={{ __html: firstPaintScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <PageSpeedInsights />
      </body>
    </html>
  );
}
