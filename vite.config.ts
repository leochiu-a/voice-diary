import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  // Microphone access needs a secure origin, also on a phone on the LAN, so the
  // dev server runs on HTTPS with a locally trusted mkcert certificate.
  server: { port: 3443 },
  // Resolves the "@/" imports from tsconfig.json.
  resolve: { tsconfigPaths: true },
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
    // Runs the server in workerd, the Workers runtime, in development too,
    // and builds it as the Worker configured in wrangler.jsonc.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
});
