// iOS shows a home-screen web app's launch image from the moment it opens until
// the page first paints; without one it shows black, then the web view's white
// background. iOS only uses an image whose media query matches the device's
// exact screen, so there is one per iPhone size, in each color scheme.

// Screen size in points and pixel ratio, portrait.
const SCREENS = [
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [430, 932, 3], // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  [428, 926, 3], // 12 Pro Max, 13 Pro Max, 14 Plus
  [420, 912, 3], // Air
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [402, 874, 3], // 16 Pro, 17 Pro, 17
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [390, 844, 3], // 12, 13, 14
  [375, 812, 3], // X, XS, 11 Pro, 12 mini, 13 mini
  [375, 667, 2], // SE (2nd and 3rd), 8
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
