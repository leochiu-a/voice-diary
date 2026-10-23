// iOS shows a home-screen web app's launch image until the page first paints,
// then fades it out over the web view's white background. That fade reads as a
// white flash in dark mode, where opening with no image goes black straight to
// the dark page. So there is only a light image, for light mode, where the fade
// is invisible. iOS picks the image when the app is added to the home screen,
// from the color scheme at that moment, and keeps it.

// Screen size in points and pixel ratio, portrait. Add a size here to cover
// another iPhone.
const SCREENS = [
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
] as const;

// The light page background.
export const STARTUP_BACKGROUND = "#f5f4f7";

// The images served under /startup/, e.g. "1179x2556.png".
export const startupImages = SCREENS.map(([w, h, ratio]) => ({
  name: `${w * ratio}x${h * ratio}.png`,
  width: w * ratio,
  height: h * ratio,
}));

// The <link rel="apple-touch-startup-image"> tags, one per screen.
export const startupLinks = SCREENS.map(([w, h, ratio]) => ({
  url: `/startup/${w * ratio}x${h * ratio}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait) and (prefers-color-scheme: light)`,
}));
