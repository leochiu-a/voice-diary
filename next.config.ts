import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Every corner holds a control on phones; errors still show without it.
  devIndicators: false,
  partialPrefetching: true,
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
