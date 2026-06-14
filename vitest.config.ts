import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      // Scope coverage to the application logic. The static OpenAPI spec and
      // the assistant system prompt are large constant strings, and the UI
      // components are exercised in the browser rather than by unit tests.
      include: ["lib/**/*.ts"],
      exclude: ["lib/openapi.ts", "lib/assistant-prompt.ts"],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
