import type { CSSProperties } from "react";

// Bar heights of the sound wave at a 180px icon, as in the app's voice-note glyph.
const BARS = [36, 64, 100, 64, 36];

// The app icon's artwork for ImageResponse: the Insights card's gradient with a
// white sound wave, drawn at `size` pixels. The home screen icon and the
// launch images both use it.
export function AppIconArt({ size, style }: { size: number; style?: CSSProperties }) {
  const scale = size / 180;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12 * scale,
        background: "linear-gradient(135deg, #7a5af8, #b28fd0)",
        ...style,
      }}
    >
      {BARS.map((height, i) => (
        <div
          key={i}
          style={{
            width: 14 * scale,
            height: height * scale,
            borderRadius: 7 * scale,
            background: "white",
          }}
        />
      ))}
    </div>
  );
}
