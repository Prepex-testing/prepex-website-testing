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

/** The shortest honest path from a fresh student to the app: log in, onboard (skipping the optional steps), skip today's check-in. */
export async function onboardAndEnterApp(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Rohan@example.com").fill(EMAIL);
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(page.getByRole("heading", { name: /What are you preparing for/ })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Tell us about you" })).toBeVisible();
  await page.getByPlaceholder("Rohan Sharma").fill("Aarav E2E");
  await page.getByPlaceholder("City").fill("Kota");
  await page.getByText("Class 12", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/where-do-you-study/);
  await page.getByText("Self-prep only").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/time-selection/);
  await page.getByRole("button", { name: /Evening/ }).click();
  await page.getByText("Evening Person").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Build your week" })).toBeVisible();
  await page.getByRole("button", { name: /Skip/ }).first().click();

  await expect(page).toHaveURL(/which-chapters-have-you-studied/);
  await page.getByRole("button", { name: /Skip/ }).first().click();

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
