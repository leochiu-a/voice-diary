import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The home screen icon. iOS rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(<AppIconArt size={size.width} />, size);
}
