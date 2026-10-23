import type { CSSProperties } from "react";

// Bar heights of the sound wave at a 180px icon, as in the app's voice-note glyph.
const BARS = [36, 64, 100, 64, 36];

// The app icon's artwork for ImageResponse: the Insights card's gradient with a
// white sound wave, drawn at `size` pixels. The home screen icon and the
// sign-in page both use it.
export function AppIconArt({
  size,
  style,
  className,
}: {
  size: number;
  style?: CSSProperties;
  className?: string;
}) {
  const scale = size / 180;
  return (
    <div
      className={className}
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
