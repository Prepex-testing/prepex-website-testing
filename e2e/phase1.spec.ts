import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { generateTodayPlan, onboardAndEnterApp, queryDb, reachTimetableStep, dismissFirstRunOverlays } from "./helpers";

// a new student meets Pexo's tour and the "no goals yet" modal; dismiss them wherever they appear
test.beforeEach(({ page }) => dismissFirstRunOverlays(page));

const EMAIL = "e2e.student@test.prepex.io";
const PASSWORD = "E2eTest!234";

/** Recreate the seeded student at onboarding step 1 (the seed script refuses non-local databases). */
function resetStudent() {
  const backend = process.env.E2E_BACKEND_DIR ?? path.resolve(__dirname, "../../prepex-backend-testing");
  execFileSync(process.execPath, [path.join(backend, "scripts", "seed-e2e.mjs")], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/prepex_dev",
    },
    stdio: "pipe",
  });
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page must not scroll sideways").toBeLessThanOrEqual(1);
}

async function expectTapTargets(page: Page, selector: string, min = 44) {
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

test.describe.configure({ mode: "serial" });

test.beforeAll(() => resetStudent());

test("onboarded student → weekly goals → today's plan follows them → a watched lecture moves the goal", async ({ page }, info) => {
  // Onboarding itself (the v2 canvas, age included) is covered by onboarding-v2*.spec.ts; this journey starts after it.
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-${name}.png`, fullPage: false });
  await onboardAndEnterApp(page);

  // ── weekly goals ─────────────────────────────────────────────────────────────
  await page.goto("/goals");
  await expect(page.getByTestId("goals-page")).toBeVisible({ timeout: 60_000 });
  if (!(await page.getByTestId("goal-composer").isVisible())) await page.getByTestId("open-add-goal").click();
  await expect(page.getByTestId("goal-composer")).toBeVisible();
  if (mobile) await noHorizontalScroll(page);

  await page.getByTestId("goal-type-LECTURES").click();
  await page.getByTestId("goal-subject").selectOption({ label: "Physics" });
  await page.getByTestId("goal-target-plus").click();
  await page.getByTestId("add-goal").click();
  await expect(page.getByTestId("goal-drafts")).toBeVisible();

  await page.getByTestId("goal-type-QUESTIONS").click();
  await page.getByTestId("goal-subject").selectOption({ label: "Maths" });
  await page.getByTestId("add-goal").click();
  await shot("goals-drafts");
  if (mobile) await expectTapTargets(page, '[data-testid="save-goals"]');
  await page.getByTestId("save-goals").click();
  await expect(page.getByTestId("goal-card")).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByTestId("week-summary")).toBeVisible();
  await shot("goals-saved");
  if (mobile) await noHorizontalScroll(page);

  // ── today's plan is built from the goals ─────────────────────────────────────
  await generateTodayPlan(page);
  const linked = queryDb<{ n: string }>(
    "SELECT count(*)::text AS n FROM core.plan_tasks t JOIN core.users u ON u.id = t.\"userId\" WHERE u.email = $1 AND t.weekly_goal_id IS NOT NULL",
    [EMAIL],
  );
  expect(Number(linked[0]!.n), "today's plan holds tasks from the weekly goals").toBeGreaterThan(0);
  await page.goto("/planner");
  await expect(page.getByTestId("study-task").first()).toBeVisible({ timeout: 60_000 });
  await shot("home-plan");
  if (mobile) await noHorizontalScroll(page);

  // ── self-reporting a lecture moves the progress ──────────────────────────────
  await page.goto("/goals");
  const lectures = page.getByTestId("goal-card").filter({ hasText: /lecture/i }).first();
  await lectures.getByTestId("goal-menu").click();
  await page.getByTestId("lecture-plus").first().click();
  await expect(lectures.getByTestId("goal-progress-text")).toContainText("1", { timeout: 20_000 });
});

test("timetable: drag on the grid creates a block, snapped to 15 minutes", async ({ page }) => {
  resetStudent(); // start from onboarding step 1
  await reachTimetableStep(page);
  await expect(page.getByTestId("timetable-builder")).toBeVisible();

  // Start from an empty week (the starter week is replaced after a confirm), so the new block is the only one.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByTestId("tt-block")).toHaveCount(0);
  await page.getByTestId("chip-SELF_STUDY").click();
  const column = page.locator('[data-testid^="day-col-"]').first();
  const scroll = page.getByTestId("timetable-scroll");

  // Bring 10:00 into view, then drag 10:07 → 11:20 (should snap to 10:00–11:15 or 10:15–11:30).
  const height = (await column.boundingBox())!.height;
  await scroll.evaluate((el, h) => (el.scrollTop = h * (9.5 / 24)), height);
  const box = (await column.boundingBox())!;
  const y = (min: number) => box.y + (box.height * min) / 1440;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y(10 * 60 + 7));
  await page.mouse.down();
  await page.mouse.move(x, y(10 * 60 + 40), { steps: 6 });
  await page.mouse.move(x, y(11 * 60 + 20), { steps: 6 });
  await page.mouse.up();

  const block = page.getByTestId("tt-block");
  await expect(block).toHaveCount(1);
  const label = (await block.first().getAttribute("aria-label")) ?? "";
  expect(label).toMatch(/Self-study/);
  expect(label).toMatch(/(10|11):(00|15|30|45) (AM|PM)/);
});
