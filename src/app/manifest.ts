import type { MetadataRoute } from "next";

// Opened from the home screen, the diary runs on its own, without the
// browser's address bar and toolbar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voice Diary",
    short_name: "Voice Diary",
    description: "A private diary for your journey, written or spoken.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
