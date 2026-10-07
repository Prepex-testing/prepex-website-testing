import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke for Phase 1 (login → onboarding → timetable → goals → plan).
 *
 * It runs against a REAL local stack — the three backend services plus this site —
 * because a Vercel preview alone has no backend behind it. Bring the stack up first:
 *
 *   backend:  node scripts/dev-env.mjs && node scripts/seed-e2e.mjs   (then start the 3 services)
 *   website:  npm run dev -- -p 5000     (or `npm run build && npm start -- -p 5000`)
 *   then:     npm run e2e
 *
 * `E2E_BACKEND_DIR` points at the backend checkout (default ../prepex-backend-testing); the suite
 * re-runs its seed script before each project so the student always starts at onboarding step 1.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./e2e/.artifacts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-390x844",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "desktop-1280x800",
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
});
