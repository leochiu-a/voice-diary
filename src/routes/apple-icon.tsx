import { createFileRoute } from "@tanstack/react-router";
import { AppIconArt } from "@/lib/app-icon";
import { imageResponse } from "@/lib/image-response";

const SIZE = 180;

// The home screen icon. iOS rounds the corners itself.
export const Route = createFileRoute("/apple-icon")({
  server: {
    handlers: {
      GET: () => imageResponse(<AppIconArt size={SIZE} />, { width: SIZE, height: SIZE }),
    },
  },
});
