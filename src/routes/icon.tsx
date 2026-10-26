import { createFileRoute } from "@tanstack/react-router";
import { AppIconArt } from "@/lib/app-icon";
import { imageResponse } from "@/lib/image-response";

const SIZE = 64;

// The browser tab's icon: the home screen icon's artwork, with the rounded
// corners a tab doesn't add itself. Drawn at twice a tab's 32px so it stays
// sharp on high-density screens.
export const Route = createFileRoute("/icon")({
  server: {
    handlers: {
      GET: () =>
        imageResponse(<AppIconArt size={SIZE} style={{ borderRadius: SIZE * 0.225 }} />, {
          width: SIZE,
          height: SIZE,
        }),
    },
  },
});
