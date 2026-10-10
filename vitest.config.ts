import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests: pure logic under lib/ (node) and component tests (a test file opts into jsdom with
// `// @vitest-environment jsdom`). End-to-end behaviour is covered by the Playwright suite in e2e/.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      // Phase 1, 2C and 3 logic + components; the older screens are exercised by e2e/.
      include: ["lib/goals/**", "lib/timetable/**", "lib/study/**", "lib/logs/**", "components/logs/**", "components/focus/**", "components/mistakes/**", "components/sessions/QuickLogForm.tsx", "components/sessions/StudyLogList.tsx"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "components/focus/useFocusSession.ts", "components/sessions/WeekChart.tsx", "components/logs/charts.tsx", "components/logs/LazyCharts.tsx", "components/logs/SharePanel.tsx"],
      reporter: ["text-summary", "text"],
    },
  },
});
