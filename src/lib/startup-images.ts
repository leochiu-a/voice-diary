// iOS shows a home-screen web app's launch image from the moment it opens until
// the page first paints; without one it shows black, then the web view's white
// background. iOS only uses an image whose media query matches the device's
// exact screen, so each iPhone size needs its own, in each color scheme.

// Screen size in points and pixel ratio, portrait. Add a size here to cover
// another iPhone.
const SCREENS = [
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
] as const;

export const SCHEMES = {
  light: { background: "#f5f4f7" },
  dark: { background: "#000000" },
} as const;

export type Scheme = keyof typeof SCHEMES;

export type StartupImage = {
  // File name under /startup/, e.g. "1179x2556-dark.png".
  name: string;
  width: number;
  height: number;
  scheme: Scheme;
  // When iOS picks it, for <link rel="apple-touch-startup-image" media>.
  media: string;
};

export const startupImages: StartupImage[] = SCREENS.flatMap(([w, h, ratio]) =>
  (Object.keys(SCHEMES) as Scheme[]).map((scheme) => ({
    name: `${w * ratio}x${h * ratio}-${scheme}.png`,
    width: w * ratio,
    height: h * ratio,
    scheme,
    media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait) and (prefers-color-scheme: ${scheme})`,
  })),
);
