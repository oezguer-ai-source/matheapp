/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react() as any],
  css: {
    // Disable PostCSS processing in tests — Tailwind v4's PostCSS plugin
    // is incompatible with Vitest's bundled Vite. Tests don't need CSS.
    postcss: {},
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
