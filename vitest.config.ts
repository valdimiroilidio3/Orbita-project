import { defineConfig } from "vitest/config";
import path from "node:path";

// Next.js server modules are stubbed in unit tests: the engine under test is
// framework-independent, and these modules only make sense inside the Next
// runtime (server actions, redirects, auth).
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@/lib/auth": path.resolve(__dirname, "test/stubs/auth.ts"),
      "next/navigation": path.resolve(__dirname, "test/stubs/next-navigation.ts"),
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
