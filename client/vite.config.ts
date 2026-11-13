import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    // jsdom plus userEvent interactions run 1-2s each, and the suite competes
    // with the dev servers on a developer machine. Vitest's 5s default turned
    // healthy tests red once the suite grew past a handful of files.
    testTimeout: 20000,
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.tsx"],
  },
});

