import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";
import { stubPlannerApi } from "./stubs/plannerStubs";
import { gateLocked, homeCardReady, makeOverview, makeSnapshot } from "../lib/rankGps/fixtures";
import type { RankGpsOverview } from "../lib/api/rankGps";

/**
 * Rank GPS in a real browser against a stubbed API (no backend, no account): the five states a student can be in, in light and
 * dark, with no console errors, no sideways scroll and no 429s. Set RANK_GPS_SHOTS_DIR to also save the screenshots and the
 * two share images.
 */

const SHOTS = process.env.RANK_GPS_SHOTS_DIR;
const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });

const SCENARIOS: Record<string, RankGpsOverview> = {
  "1-new-user-locked": makeOverview({ gate: gateLocked, snapshot: null, refresh: { limit: 3, used: 0, left: 3, inWindow: true, windowEndsAt: "2026-12-01T00:00:00.000Z", canRefresh: false, reason: "Rank GPS unlocks after 7 days and 3 study days." } }),
  "2-one-week-full-preview": makeOverview({ snapshot: makeSnapshot("preview", { withMocks: false, withAutopsy: false, withChange: false }) }),
  "3-three-weeks-mocks-free-banner": makeOverview({ snapshot: makeSnapshot("free", { showProBanner: true }) }),
  "4-neet": makeOverview({ snapshot: makeSnapshot("preview", { track: "neet" }), track: "neet" }),
  "5-heavy-mistake-mock": makeOverview({ snapshot: makeSnapshot("preview", { heavyMistakes: true }) }),
};

async function open(page: Page, overview: RankGpsOverview, theme: "light" | "dark", route = "/analytics/rank-gps") {
  await page.emulateMedia({ colorScheme: theme });
  await stubPlannerApi(page, theme);
  let rankGpsCalls = 0;
  await page.route(/localhost:4\d{3}\/api\/(rank-gps|xp\/summary)/, (route: Route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith("/xp/summary")) return route.fulfill(ok({ level: 3, title: "Aspirant", totalXp: 420, currentThreshold: 300, nextThreshold: 600, progressPct: 40, todayXp: 20, monthXp: 200, todayMinutes: 50, todayStudyMinutes: 95, rankGps: homeCardReady }));
    rankGpsCalls += 1;
    return route.fulfill(ok(overview));
  });
  await page.route(/localhost:4\d{3}\/api\/backlog/, (route: Route) => route.fulfill(ok({ totals: { open: 3, scheduled: 1, overdue: 1, total: 4 }, items: [], bySubject: [] })));
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); if (m.text().includes("share image failed")) console.log(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(route);
  return { errors, calls: () => rankGpsCalls };
}

async function noSidewaysScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(1);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`Rank GPS (${theme})`, () => {
    for (const [name, overview] of Object.entries(SCENARIOS)) {
      test(name, async ({ page }, info) => {
        const { errors, calls } = await open(page, overview, theme);
        if (!overview.snapshot) await expect(page.getByTestId("rank-gps-locked")).toBeVisible();
        else await expect(page.getByTestId("rank-gps-report")).toBeVisible();
        await page.waitForTimeout(700); // let the gauge finish filling
        await noSidewaysScroll(page);
        expect(calls()).toBeLessThanOrEqual(1); // one request to view the page
        if (overview.snapshot?.tier === "free") await expect(page.getByTestId("pro-banner")).toBeVisible();
        if (overview.snapshot?.report.track === "neet") await expect(page.getByTestId("hero-no-percentile")).toBeVisible();
        if (SHOTS) {
          fs.mkdirSync(SHOTS, { recursive: true });
          await page.screenshot({ path: path.join(SHOTS, `${name}-${theme}-${info.project.name}.png`), fullPage: true });
        }
        expect(errors.filter((e) => !/favicon|Failed to load resource/.test(e))).toEqual([]);
      });
    }
  });
}

test("Add to this week confirms first; the share sheet keeps percentile, rank and name off by default and exports both sizes", async ({ page }, info) => {
  await open(page, SCENARIOS["5-heavy-mistake-mock"]!, "light");
  await page.route(/\/rank-gps\/moves\//, (route) => route.fulfill(ok({ added: true, alreadyThere: false })));
  await expect(page.getByTestId("rank-gps-report")).toBeVisible();
  await page.getByTestId("move-add-1").click();
  await expect(page.getByTestId("move-confirm-1")).toBeVisible();
  await page.getByTestId("move-confirm-yes-1").click();
  await expect(page.getByTestId("move-done-1")).toContainText("Added to this week");

  await page.getByTestId("share-open").click();
  const sheet = page.getByTestId("share-sheet");
  await expect(sheet).toBeVisible();
  for (const s of await sheet.getByRole("switch").all()) await expect(s).toHaveAttribute("aria-checked", "false");
  await expect(page.getByTestId("rank-gps-share-preview")).toBeVisible();
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const format of ["story", "square"] as const) {
      await sheet.getByRole("button", { name: format === "story" ? /Story/ : /Square/ }).click();
      await expect(page.getByTestId("rank-gps-share-preview")).toBeVisible();
      const src = await page.getByTestId("rank-gps-share-preview").getAttribute("src");
      fs.writeFileSync(path.join(SHOTS, `share-${format}-${info.project.name}.png`), Buffer.from((src ?? "").split(",")[1] ?? "", "base64"));
    }
    await page.screenshot({ path: path.join(SHOTS, `share-sheet-${info.project.name}.png`) });
  }
});

test("the old diagnosis addresses redirect to Rank GPS", async ({ request }) => {
  for (const old of ["/diagnosis", "/diagnosis/0b6f5f0e-0000-4000-8000-000000000000", "/analytics/week"]) {
    const res = await request.get(old, { maxRedirects: 0 });
    expect([307, 308], old).toContain(res.status());
    expect(res.headers()["location"], old).toMatch(/\/analytics\/rank-gps$/);
  }
});
