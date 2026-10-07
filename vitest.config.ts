import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests for the pure logic under lib/ (grid rules, templates, formatters).
// UI behaviour is covered by the Playwright suite in e2e/.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // New Phase 1 logic only; the pre-existing screens are exercised by e2e/.
      include: ["lib/goals/**", "lib/timetable/**"],
      exclude: ["**/*.test.ts"],
      reporter: ["text-summary", "text"],
    },
  },
});
