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

// The images served under /startup/, e.g. "1179x2556-dark.png".
export const startupImages = SCREENS.flatMap(([w, h, ratio]) =>
  (Object.keys(SCHEMES) as Scheme[]).map((scheme) => ({
    name: `${w * ratio}x${h * ratio}-${scheme}.png`,
    width: w * ratio,
    height: h * ratio,
    scheme,
  })),
);

// The <link rel="apple-touch-startup-image"> tags. Each screen gets one per
// color scheme, then the dark image again without the color-scheme condition,
// for an iOS that does not evaluate prefers-color-scheme here.
export const startupLinks = SCREENS.flatMap(([w, h, ratio]) => {
  const screen = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`;
  const url = (scheme: Scheme) => `/startup/${w * ratio}x${h * ratio}-${scheme}.png`;
  return [
    ...(Object.keys(SCHEMES) as Scheme[]).map((scheme) => ({
      url: url(scheme),
      media: `${screen} and (prefers-color-scheme: ${scheme})`,
    })),
    { url: url("dark"), media: screen },
  ];
});
