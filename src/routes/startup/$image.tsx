import { createFileRoute } from "@tanstack/react-router";
import { AppIconArt } from "@/lib/app-icon";
import { imageResponse } from "@/lib/image-response";
import { SCHEMES, startupImages } from "@/lib/startup-images";

// A launch image: the app's background with its icon in the middle, as a
// native app's launch screen.
export const Route = createFileRoute("/startup/$image")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const match = startupImages.find(({ name }) => name === params.image);
        if (!match) return new Response("Not found", { status: 404 });
        const { width, height, scheme } = match;
        const icon = Math.round(width * 0.28);
        return imageResponse(
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
          { width, height },
        );
      },
    },
  },
});
