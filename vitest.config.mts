import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Resolves the "@/" imports from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
  },
});
