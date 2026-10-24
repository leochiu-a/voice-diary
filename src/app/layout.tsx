import type { Metadata, Viewport } from "next";
import { PageSpeedInsights } from "@/components/page-speed-insights";
import { QueryProvider } from "@/components/query-provider";
import { calendarPanelScript } from "@/lib/calendar-panel";
import { firstPaintScript } from "@/lib/first-paint";
import { startupLinks } from "@/lib/startup-images";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Diary",
  description: "A private diary for your journey, written or spoken.",
  // Added to the home screen, it opens full screen like an app, showing a
  // launch image until the page first paints.
  appleWebApp: {
    capable: true,
    title: "Voice Diary",
    startupImage: startupLinks,
  },
  // Next writes the standard "mobile-web-app-capable"; iOS only shows launch
  // images for pages that also carry its own older name for it.
  other: { "apple-mobile-web-app-capable": "yes" },
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
        <QueryProvider>{children}</QueryProvider>
        <PageSpeedInsights />
      </body>
    </html>
  );
}
