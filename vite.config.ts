import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  // Microphone access needs a secure origin, also on a phone on the LAN, so the
  // dev server runs on HTTPS with a locally trusted mkcert certificate.
  server: { port: 3443 },
  // Resolves the "@/" imports from tsconfig.json.
  resolve: { tsconfigPaths: true },
  // A native addon, which Node loads as is rather than through the bundler.
  // Only server routes use it, but the dev server's dependency scan reads them.
  ssr: { external: ["@resvg/resvg-js"] },
  optimizeDeps: { exclude: ["@resvg/resvg-js"] },
  build: {
    rolldownOptions: {
      // Libraries written for React Server Components mark their modules
      // "use client", which means nothing here.
      onLog(level, log, handler) {
        if (log.code !== "MODULE_LEVEL_DIRECTIVE") handler(level, log);
      },
    },
  },
  plugins: [
    mkcert(),
    tailwindcss(),
    tanstackStart(),
    // Builds the server for the host it deploys to (Vercel's functions there).
    nitro(),
    react(),
  ],
});
