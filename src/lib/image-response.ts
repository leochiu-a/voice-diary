import "@tanstack/react-start/server-only";
import { Resvg } from "@resvg/resvg-js";
import type { ReactElement } from "react";
import satori from "satori";

// Draws the app's generated images (icons, launch images) as PNGs: satori
// lays the element out as SVG, resvg rasterizes it. They hold no text, so no
// fonts are loaded. They only change with a deploy, so the CDN keeps each one
// until the next.
export async function imageResponse(
  element: ReactElement,
  size: { width: number; height: number },
) {
  const svg = await satori(element, { ...size, fonts: [] });
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=0, s-maxage=31536000",
    },
  });
}
