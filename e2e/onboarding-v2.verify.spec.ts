import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { queryDb } from "./helpers";

/**
 * Onboarding v2 final verification, on a PRODUCTION build against the real local stack: layout shift and interaction
 * latency on the new screens and on Home's first load, rapid tab switching with zero 429s, and screenshots in light and
 * dark at 390 and 1440 px. Run on demand: E2E_VERIFY=1 (it is slow and writes screenshots).
 */
test.skip(!process.env.E2E_VERIFY, "run with E2E_VERIFY=1");
test.describe.configure({ mode: "serial" });

import { THEME_STORAGE_KEY as THEME_KEY } from "../components/theme/constants";
const OUT = process.env.E2E_SHOTS ?? "e2e/.artifacts/onboarding-v2-shots";
const TEST_CODE = "975310";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function observe(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number; __events: number[] };
    w.__cls = 0;
    w.__events = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { interactionId?: number })[]) if (e.interactionId) w.__events.push(e.duration);
    }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });
}
const metrics = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __cls: number; __events: number[] };
  const ev = [...w.__events].sort((a, b) => a - b);
  return { cls: Math.round(w.__cls * 1000) / 1000, inp: ev.length ? ev[Math.min(ev.length - 1, Math.floor(ev.length * 0.98))] : 0, interactions: ev.length };
});

async function flagsOn(page: Page) {
  await page.addInitScript(() => window.localStorage.removeItem("prepex:auth-flags"));
  await page.route("**/api/auth/flags", (r) => r.fulfill({ json: { success: true, data: { onboardingV2: true, guestMode: true } } }));
}

const results: Record<string, unknown> = {};
test.afterAll(() => console.log(`[verify] ${JSON.stringify(results)}`));

test("sign-in + canvas + first Home: CLS, INP and the 429 count", async ({ page }) => {
  test.setTimeout(300_000);
  await observe(page);
  await flagsOn(page);
  let tooMany = 0;
  page.on("response", (r) => {
    if (r.status() === 429) tooMany += 1;
  });

  await page.goto("/start");
  await expect(page.getByTestId("signin-v2")).toBeVisible();
  const email = `v2.verify.${Date.now()}@test.prepex.io`;
  await page.getByTestId("signin-email").click();
  await page.getByPlaceholder("Rohan@example.com").fill(email);
  await page.getByTestId("signin-send-code").click();
  await expect(page.getByTestId("signin-code")).toBeVisible({ timeout: 20_000 });
  results.signin = await metrics(page);
  queryDb("UPDATE auth.email_login_codes SET code_hash = $1 WHERE email = $2", [sha256(TEST_CODE), email]);
  await page.getByTestId("signin-code").fill(TEST_CODE);
  await expect(page.getByTestId("onb-canvas")).toBeVisible({ timeout: 45_000 });

  const at = (q: string) => expect(page.getByTestId("onb-canvas")).toHaveAttribute("data-question", q, { timeout: 20_000 });
  await page.getByTestId("onb-prefs-next").click();
  await at("name");
  await page.getByTestId("onb-name").fill("Verify Student");
  await page.getByTestId("onb-name-next").click();
  await at("exam");
  await page.getByTestId("onb-exam-both").click();
  await at("class");
  await page.getByTestId("onb-class-CLASS_12").click();
  await at("exam_date");
  await expect(page.getByTestId("onb-date-yes")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("onb-date-yes").click();
  await at("school");
  await page.getByTestId("onb-school-morning").click();
  await at("coaching");
  await page.getByTestId("onb-coaching-SELF").click();
  await at("hours");
  await page.getByTestId("onb-hours-4").click();
  await at("windows");
  await page.getByTestId("onb-window-EVENING").click();
  await page.getByTestId("onb-windows-next").click();
  await at("week");
  await page.getByTestId("onb-week-ok").click();
  await at("chapters");
  results.canvas = await metrics(page);
  await page.getByTestId("onb-skip").click();
  await expect(page.getByTestId("onb-goals").or(page.locator("text=/welcome/i").first())).toBeVisible({ timeout: 90_000 });
  if (await page.getByTestId("onb-goals").isVisible()) await page.getByTestId("onb-goals-ok").click();
  await expect(page).toHaveURL(/welcome-to-prepex/, { timeout: 60_000 });

  // first Home load (a fresh page so the numbers are Home's own)
  await page.goto("/home");
  const skip = page.getByText("Skip for today");
  if (await skip.waitFor({ timeout: 20_000 }).then(() => true, () => false)) await skip.click();
  await expect(page.getByTestId("home-top")).toBeVisible({ timeout: 60_000 });
  const tour = page.getByTestId("pexo-tour-skip");
  if (await tour.waitFor({ timeout: 10_000 }).then(() => true, () => false)) await tour.click();
  await expect(page.getByTestId("home-level")).toContainText(/Level \d+/, { timeout: 30_000 });
  await page.waitForTimeout(2000);
  results.home = await metrics(page);

  // rapid tab switching through the app's main screens
  const tabs = ["/home", "/planner", "/goals", "/analytics", "/logs", "/home"];
  for (let round = 0; round < 5; round++) for (const t of tabs) {
    await page.goto(t, { waitUntil: "commit" });
    await page.waitForTimeout(150);
  }
  await page.goto("/home");
  await expect(page.getByTestId("home-top")).toBeVisible({ timeout: 60_000 });
  results.tooManyRequests = tooMany;
  expect(tooMany).toBe(0);
  expect((results.home as { cls: number }).cls).toBeLessThan(0.1);
  expect((results.canvas as { cls: number }).cls).toBeLessThan(0.1);
});

test("screenshots: light and dark, 390 and 1440", async ({ browser }) => {
  test.setTimeout(240_000);
  mkdirSync(OUT, { recursive: true });
  for (const scheme of ["light", "dark"] as const)
    for (const width of [390, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme });
      const page = await ctx.newPage();
      await flagsOn(page);
      // the app's own theme setting (it does not follow the system by default)
      await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [THEME_KEY, scheme] as const);
      await page.goto("/start");
      await expect(page.getByTestId("signin-v2")).toBeVisible();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/signin-${scheme}-${width}.png`, fullPage: true });
      const email = `v2.shot.${scheme}.${width}.${Date.now()}@test.prepex.io`;
      await page.getByTestId("signin-email").click();
      await page.getByPlaceholder("Rohan@example.com").fill(email);
      await page.getByTestId("signin-send-code").click();
      await expect(page.getByTestId("signin-code")).toBeVisible({ timeout: 20_000 });
      queryDb("UPDATE auth.email_login_codes SET code_hash = $1 WHERE email = $2", [sha256(TEST_CODE), email]);
      await page.getByTestId("signin-code").fill(TEST_CODE);
      await expect(page.getByTestId("onb-canvas")).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${OUT}/canvas-prefs-${scheme}-${width}.png`, fullPage: true });
      await page.getByTestId("onb-prefs-next").click();
      await page.getByTestId("onb-name").fill("Asha Rao");
      await page.getByTestId("onb-name-next").click();
      await page.getByTestId("onb-exam-both").click();
      await page.getByTestId("onb-class-CLASS_12").click();
      await expect(page.getByTestId("onb-date-yes")).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${OUT}/canvas-date-${scheme}-${width}.png`, fullPage: true });
      await page.getByTestId("onb-date-yes").click();
      await page.getByTestId("onb-school-morning").click();
      await page.getByTestId("onb-coaching-OFFLINE").click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/canvas-coaching-time-${scheme}-${width}.png`, fullPage: true });
      await page.getByTestId("onb-ctime-EVENING").click();
      await page.getByTestId("onb-hours-4").click();
      await page.getByTestId("onb-window-EVENING").click();
      await page.getByTestId("onb-window-NIGHT").click();
      await page.getByTestId("onb-windows-next").click();
      await expect(page.getByTestId("onb-week")).toBeVisible();
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${OUT}/canvas-week-${scheme}-${width}.png`, fullPage: true });
      await ctx.close();
    }
});
