import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    // Unit + integration tests live under tests/. Playwright specs (e2e/) are
    // excluded so the two runners never pick up each other's files.
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: ["**/*.d.ts", "lib/prisma.ts", "lib/redis.ts"],
    },
  },
  resolve: {
    alias: {
      // Mirror the "@/*" -> project root mapping from tsconfig.json.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
