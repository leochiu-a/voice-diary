import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/app-icon";
import { SCHEMES, startupImages } from "@/lib/startup-images";

// Every launch image is drawn at build time.
export function generateStaticParams() {
  return startupImages.map(({ name }) => ({ image: name }));
}

// A launch image: the app's background with its icon in the middle, as a
// native app's launch screen.
export async function GET(_request: Request, { params }: RouteContext<"/startup/[image]">) {
  const { image } = await params;
  const match = startupImages.find(({ name }) => name === image);
  if (!match) return new Response("Not found", { status: 404 });
  const { width, height, scheme } = match;
  const icon = Math.round(width * 0.28);
  return new ImageResponse(
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
}
