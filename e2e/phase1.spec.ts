import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

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

test("login → onboarding → timetable → weekly goals → plan", async ({ page }, info) => {
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-${name}.png`, fullPage: false });

  // ── login ────────────────────────────────────────────────────────────────────
  await page.goto("/login");
  await page.getByPlaceholder("Rohan@example.com").fill(EMAIL);
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();

  // ── onboarding 1: exam ───────────────────────────────────────────────────────
  await expect(page.getByRole("heading", { name: /What are you preparing for/ })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // ── onboarding 2: about you ──────────────────────────────────────────────────
  await expect(page.getByRole("heading", { name: "Tell us about you" })).toBeVisible();
  await page.getByPlaceholder("Rohan Sharma").fill("Aarav E2E");
  await page.getByPlaceholder("City").fill("Kota");
  await page.getByText("Class 12", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // ── onboarding 3: where do you study ─────────────────────────────────────────
  await expect(page).toHaveURL(/where-do-you-study/);
  await page.getByText("Self-prep only").click();
  await page.getByRole("button", { name: "Continue" }).click();

  // ── onboarding 4: study time ─────────────────────────────────────────────────
  await expect(page).toHaveURL(/time-selection/);
  await page.getByRole("button", { name: /Evening/ }).click();
  await page.getByText("Evening Person").click();
  await page.getByRole("button", { name: "Continue" }).click();

  // ── onboarding 5: build the timetable ────────────────────────────────────────
  await expect(page.getByRole("heading", { name: "Build your week" })).toBeVisible();
  await expect(page.getByTestId("timetable-builder")).toBeVisible();
  await shot("timetable-empty");
  if (mobile) await noHorizontalScroll(page);

  await page.getByTestId("template-SCHOOL_COACHING").click();
  await expect.poll(() => page.getByTestId("tt-block").count()).toBeGreaterThan(5);
  await expect(page.getByTestId("study-summary")).toContainText(/study/i);
  await shot("timetable-template");
  if (mobile) {
    await expectTapTargets(page, '[data-testid^="template-"]');
    await expectTapTargets(page, '[data-testid="save-timetable"]');
  }

  await page.getByTestId("save-timetable").click();

  // ── onboarding 6: chapters studied (skipped), then the first plan ────────────
  await expect(page).toHaveURL(/which-chapters-have-you-studied/);
  await page.getByRole("button", { name: /Skip/ }).first().click();
  await expect(page).toHaveURL(/welcome-to-prepex/, { timeout: 90_000 });
  await expect(page.getByRole("heading", { name: "Your first plan is ready" })).toBeVisible();
  await page.getByRole("link", { name: /Set this week's goals/ }).click();

  // ── weekly goals ─────────────────────────────────────────────────────────────
  await expect(page).toHaveURL(/\/goals\?welcome=1/);
  await expect(page.getByTestId("goals-welcome")).toBeVisible();
  await expect(page.getByTestId("goal-composer")).toBeVisible();
  await shot("goals-empty");
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

  // ── check-in, then the home plan with the "based on your goals" banner ───────
  await expect(page).toHaveURL(/check-in/, { timeout: 60_000 });
  await page.getByRole("button", { name: /Steady/ }).click();
  await page.getByRole("button", { name: "Continue to today's plan" }).click();
  await page.waitForURL((u) => u.pathname === "/home", { timeout: 90_000 });
  await expect(page.getByTestId("plan-source-banner")).toContainText("Based on your weekly goals", { timeout: 60_000 });
  await shot("home-plan");
  if (mobile) await noHorizontalScroll(page);

  // ── goals screen now lists both goals with progress ──────────────────────────
  await page.goto("/goals");
  await expect(page.getByTestId("goal-card")).toHaveCount(2);
  await expect(page.getByTestId("week-summary")).toBeVisible();
  await shot("goals-saved");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="lecture-plus"]');
  }

  // Self-reporting a lecture moves the progress.
  await page.getByTestId("lecture-plus").first().click();
  await expect(page.getByTestId("lectures-watched").first()).toHaveText("1");
});

test("timetable: drag on the grid creates a block, snapped to 15 minutes", async ({ page }) => {
  resetStudent(); // start from onboarding step 1 so the builder route is reachable
  await page.goto("/login");
  await page.getByPlaceholder("Rohan@example.com").fill(EMAIL);
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForURL((u) => u.pathname !== "/login", { timeout: 60_000 });

  // The builder is the same component on the onboarding step and on /timetable; this route needs no
  // finished onboarding, so the test stands alone.
  await page.goto("/onboarding/build-timetable");
  await expect(page.getByTestId("timetable-builder")).toBeVisible();
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
