// iOS shows a home-screen web app's launch image from the moment it opens until
// the page first paints; without one it shows black, then the web view's white
// background. iOS only uses an image whose media query matches the device's
// exact screen, so each iPhone size needs its own, in each color scheme.
// Switching the phone's appearance later does not change the image; the app
// has to be added again.

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

// The <link rel="apple-touch-startup-image"> tags, one per screen and color
// scheme. iOS picks one when the app is added to the home screen, from the
// color scheme at that moment, and keeps it; when several match, the last
// wins, so no tag may match regardless of scheme.
export const startupLinks = SCREENS.flatMap(([w, h, ratio]) => {
  const screen = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`;
  return (Object.keys(SCHEMES) as Scheme[]).map((scheme) => ({
    url: `/startup/${w * ratio}x${h * ratio}-${scheme}.png`,
    media: `${screen} and (prefers-color-scheme: ${scheme})`,
  }));
});
