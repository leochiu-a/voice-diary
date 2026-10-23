import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Styles arrive inside the HTML, so a page paints as soon as it lands
    // rather than after a separate stylesheet request. On an iPhone's home
    // screen app, that wait shows as a white screen.
    inlineCss: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
