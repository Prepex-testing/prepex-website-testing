import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const EMAIL = "e2e.student@test.prepex.io";
export const PASSWORD = "E2eTest!234";

/** Recreate the seeded student at onboarding step 1 (the seed script refuses non-local databases). */
export function resetStudent() {
  const backend = process.env.E2E_BACKEND_DIR ?? path.resolve(__dirname, "../../prepex-backend-testing");
  execFileSync(process.execPath, [path.join(backend, "scripts", "seed-e2e.mjs")], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/prepex_dev",
    },
    stdio: "pipe",
  });
}

export async function login(page: Page) {
  // Onboarding v2: /login opens Pexo's sign-in screen; the password form sits behind "Log in with password".
  await page.goto("/login?password=1");
  await page.getByPlaceholder("Rohan@example.com").fill(EMAIL);
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
}

/** Answers onboarding steps 1-3 (the first goal option, Class 12, self-prep) and stops on the timetable step. */
export async function reachTimetableStep(page: Page) {
  // Onboarding v2 asks for the week on its canvas; the grid builder is "Edit timetable" (/timetable) for an onboarded student.
  await onboardAndEnterApp(page);
  await page.goto("/timetable");
  await expect(page.getByTestId("timetable-builder")).toBeVisible({ timeout: 60_000 });
}

/** Runs a read-only SQL query against the local E2E database and returns the rows. */
export function queryDb<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const backend = process.env.E2E_BACKEND_DIR ?? path.resolve(__dirname, "../../prepex-backend-testing");
  const script = `
    const pg = require('pg');
    (async () => {
      const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      const r = await c.query(process.env.E2E_SQL, JSON.parse(process.env.E2E_PARAMS));
      console.log(JSON.stringify(r.rows));
      await c.end();
    })();`;
  const out = execFileSync(process.execPath, ["-e", script], {
    cwd: backend,
    env: {
      ...process.env,
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/prepex_dev",
      E2E_SQL: sql,
      E2E_PARAMS: JSON.stringify(params),
    },
  });
  return JSON.parse(out.toString()) as T[];
}

/** The "Next" button of whichever onboarding step is showing (not Pexo's own "Next" in its narration bubble). */
export async function next(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).and(page.locator(':not([data-testid="onboarding-pexo-next"])')).click();
}

/** The shortest honest path from a fresh student to the app: log in, onboard (accepting the starter week, skipping the chapters), skip today's check-in. */
export async function onboardAndEnterApp(page: Page, opts: { keepOverlays?: boolean } = {}) {
  // Onboarding v2 (the canvas) has its own specs (onboarding-v2*.spec.ts); everything else signs in with the password
  // and finishes onboarding through the same endpoint the canvas calls: Class 12, self-prep, a uniform starter week,
  // no chapters done, age 17.
  await login(page);
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
  const core = process.env.E2E_CORE_URL ?? "http://localhost:4002";
  const [exam] = queryDb<{ id: string }>("SELECT id FROM dashboard.exams WHERE is_active ORDER BY (code = 'JEE_MAIN') DESC, code LIMIT 1");
  const blocks = Array.from({ length: 7 }, (_, d) => [
    { dayOfWeek: d, startTime: "06:00", endTime: "08:00", activityType: "SELF_STUDY" },
    { dayOfWeek: d, startTime: "16:00", endTime: "21:00", activityType: "SELF_STUDY" },
  ]).flat();
  const status = await page.evaluate(
    async ({ base, body }) => {
      const token = localStorage.getItem("prepex_access_token");
      const res = await fetch(`${base}/api/onboarding/complete`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      return res.status;
    },
    {
      base: core,
      body: { examId: exam!.id, fullName: "Aarav E2E", city: "Kota", targetExamDate: "2027-01-24", examDateIsDefault: true, currentLevel: "CLASS_12", coachingType: "SELF_PREP", timetable: { uniformWeek: true, source: "COACHING_TEMPLATE", blocks }, completedChapterIds: [], ageBand: "17" },
    },
  );
  expect(status, "onboarding complete").toBeLessThan(300);
  await page.goto("/home");
  const skip = page.getByRole("button", { name: "Skip for today" });
  if (await skip.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await skip.click();
  await page.waitForURL((u) => u.pathname === "/home", { timeout: 60_000 });
  if (!opts.keepOverlays) await dismissFirstRunOverlays(page);
}

/**
 * First-run overlays a new student meets (Pexo's tour, "no goals for this week yet"): dismissed the way a student
 * can, whenever they appear, so a spec about something else is not blocked by them.
 */
export async function dismissFirstRunOverlays(page: Page) {
  await page.addLocatorHandler(page.getByTestId("pexo-tour-skip"), async (b) => b.click(), { noWaitAfter: true });
  await page.addLocatorHandler(page.getByTestId("no-goals-later"), async (b) => b.click(), { noWaitAfter: true });
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page must not scroll sideways").toBeLessThanOrEqual(1);
}

export async function expectTapTargets(page: Page, selector: string, min = 44) {
  const boxes = await page.locator(selector).evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), t: (el.textContent ?? "").trim().slice(0, 30) };
      }),
  );
  for (const b of boxes) expect(Math.min(b.w, b.h), `tap target "${b.t}" ${b.w}x${b.h}`).toBeGreaterThanOrEqual(min);
}

/**
 * Builds today's plan for the logged-in student (the real "generate" endpoint). The shortcut onboarding path skips
 * the daily check-in that would normally trigger this, so tests that need a plan on the books call it.
 */
export async function generateTodayPlan(page: Page) {
  const core = process.env.E2E_CORE_URL ?? "http://localhost:4002";
  const status = await page.evaluate(async (base) => {
    const token = localStorage.getItem("prepex_access_token");
    const res = await fetch(`${base}/api/planner/generate`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: "SCHEDULED" }),
    });
    return res.status;
  }, core);
  expect(status, "plan generation").toBeLessThan(300);
}
