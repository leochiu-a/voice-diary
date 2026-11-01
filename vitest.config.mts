import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the "@/" imports from tsconfig.json.
    tsconfigPaths: true,
    alias: { "cloudflare:workers": "/src/test/cloudflare-workers.ts" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
