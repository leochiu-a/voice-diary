import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No cacheComponents: its staged renders hang on the Cloudflare Workers
  // runtime (opennextjs/opennextjs-cloudflare#1318).
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
