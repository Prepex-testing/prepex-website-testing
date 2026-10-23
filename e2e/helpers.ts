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
  await page.goto("/login");
  await page.getByPlaceholder("Rohan@example.com").fill(EMAIL);
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
}

/** Answers onboarding steps 1-3 (the first goal option, Class 12, self-prep) and stops on the timetable step. */
export async function reachTimetableStep(page: Page) {
  await login(page);
  await expect(page.getByRole("heading", { name: /I.m preparing for/ })).toBeVisible({ timeout: 60_000 });
  await next(page);
  await expect(page.getByRole("heading", { name: "Tell us about you" })).toBeVisible();
  await page.getByPlaceholder("City").fill("Kota");
  await page.getByText("Class 12", { exact: true }).click();
  await next(page);
  await expect(page).toHaveURL(/where-do-you-study/);
  await page.getByText("Self-prep only").click();
  await next(page);
  await expect(page.getByRole("heading", { name: "Build your week" })).toBeVisible();
  await expect(page.getByTestId("timetable-builder")).toBeVisible();
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

/** The "Next" button of whichever onboarding step is showing. */
export async function next(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

/** The shortest honest path from a fresh student to the app: log in, onboard (accepting the starter week, skipping the chapters), skip today's check-in. */
export async function onboardAndEnterApp(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Rohan@example.com").fill(EMAIL);
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(page.getByRole("heading", { name: /I.m preparing for/ })).toBeVisible({ timeout: 60_000 });
  await next(page);

  await expect(page.getByRole("heading", { name: "Tell us about you" })).toBeVisible();
  await page.getByPlaceholder("Rohan Sharma").fill("Aarav E2E");
  await page.getByPlaceholder("City").fill("Kota");
  await page.getByText("Class 12", { exact: true }).click();
  await next(page);

  await expect(page).toHaveURL(/where-do-you-study/);
  await page.getByText("Self-prep only").click();
  await next(page);

  // The coaching answer already loaded a starter week, so the shortest honest path is to accept it.
  await expect(page.getByRole("heading", { name: "Build your week" })).toBeVisible();
  await expect(page.getByTestId("tt-block").first()).toBeVisible();
  await next(page);

  await expect(page).toHaveURL(/which-chapters-have-you-studied/);
  await page.getByTestId("skip-chapters").click();

  await expect(page).toHaveURL(/welcome-to-prepex/, { timeout: 90_000 });
  await page.getByRole("link", { name: /Skip — go to my dashboard/ }).click();

  await expect(page).toHaveURL(/check-in/);
  await page.getByRole("button", { name: "Skip for today" }).click();
  await page.waitForURL((u) => u.pathname === "/home", { timeout: 60_000 });
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
