import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/app-icon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// The browser tab's icon: the home screen icon's artwork, with the rounded
// corners a tab doesn't add itself. Drawn at twice a tab's 32px so it stays
// sharp on high-density screens.
export default function Icon() {
  return new ImageResponse(
    <AppIconArt size={size.width} style={{ borderRadius: size.width * 0.225 }} />,
    size,
  );
}
