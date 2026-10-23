import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Bar heights of the sound wave, as in the app's voice-note glyph.
const BARS = [36, 64, 100, 64, 36];

// The home screen icon: the Insights card's gradient with a white sound wave.
// iOS rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "linear-gradient(135deg, #7a5af8, #b28fd0)",
      }}
    >
      {BARS.map((height, i) => (
        <div key={i} style={{ width: 14, height, borderRadius: 7, background: "white" }} />
      ))}
    </div>,
    size,
  );
}
