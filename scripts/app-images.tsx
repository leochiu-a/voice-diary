import { mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import type { ReactElement } from "react";
import satori from "satori";
import { AppIconArt } from "@/lib/app-icon";
import { SCHEMES, startupImages } from "@/lib/startup-images";

// Draws the app's icons and launch images into public/, before the dev server
// starts and before each build, so they are served as static files: satori
// lays each out as SVG and resvg rasterizes it. They hold no text, so no fonts
// are loaded. Git ignores the output; the artwork lives in src/lib/app-icon.tsx.

async function write(path: string, element: ReactElement, width: number, height: number) {
  const svg = await satori(element, { width, height, fonts: [] });
  writeFileSync(`public/${path}`, new Resvg(svg).render().asPng());
}

// The browser tab's icon: the home screen icon's artwork, with the rounded
// corners a tab doesn't add itself. Drawn at twice a tab's 32px so it stays
// sharp on high-density screens.
await write("icon.png", <AppIconArt size={64} style={{ borderRadius: 64 * 0.225 }} />, 64, 64);

// The home screen icon. iOS rounds the corners itself.
await write("apple-icon.png", <AppIconArt size={180} />, 180, 180);

// The launch images: the app's background with its icon in the middle, as a
// native app's launch screen.
mkdirSync("public/startup", { recursive: true });
for (const { name, width, height, scheme } of startupImages) {
  const icon = Math.round(width * 0.28);
  await write(
    `startup/${name}`,
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: SCHEMES[scheme].background,
      }}
    >
      {/* iOS's icon corner radius is about 22% of its side. */}
      <AppIconArt size={icon} style={{ borderRadius: icon * 0.225 }} />
    </div>,
    width,
    height,
  );
}
