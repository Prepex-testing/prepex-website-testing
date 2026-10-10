import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { expectTapTargets, generateTodayPlan, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

test.describe.configure({ mode: "serial" });

test("revision: log a revision → it shows up in the analytics (and can be planned)", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-3-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);

  // ── hub ─────────────────────────────────────────────────────────────────────
  await page.goto("/logs");
  await expect(page.getByTestId("logs-hub")).toBeVisible();
  await expect(page.getByTestId("study-tabs").getByRole("link", { name: "Logs" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("hub-revision")).toBeVisible();
  await expect(page.getByTestId("hub-backlog")).toBeVisible();
  await expect(page.getByTestId("hub-practice")).toBeVisible();
  await expect(page.getByTestId("hub-revision-value")).toHaveText("0");
  await expect(page.getByTestId("hub-practice-value")).toHaveText("—");
  if (mobile) {
    await expectTapTargets(page, '[data-testid="study-tabs"] a');
    await noHorizontalScroll(page);
  }
  await shot("hub");

  // ── revision: Today tab, then log ──────────────────────────────────────────
  await page.getByTestId("hub-revision").click();
  await expect(page.getByTestId("revision-page")).toBeVisible();
  await expect(page.getByTestId("revision-today")).toBeVisible();
  if (mobile) {
    await expectTapTargets(page, '[role="tab"]');
    await noHorizontalScroll(page);
  }
  await page.getByTestId("revision-tab-log").click();

  await page.getByTestId("rev-submit").click();
  await expect(page.getByTestId("rev-form").getByRole("alert")).toHaveText(/choose a subject/i);
  await page.getByTestId("rev-subject").selectOption({ label: "Physics" });
  await page.getByTestId("rev-submit").click();
  await expect(page.getByTestId("rev-form").getByRole("alert")).toHaveText(/choose a chapter/i);
  await page.getByTestId("rev-chapter").selectOption({ label: "Kinematics" });
  await page.getByTestId("rev-type-short_notes").click();
  await page.getByTestId("rev-preset-45").click();
  await page.getByTestId("rev-with-questions").check();
  await page.getByTestId("rev-solved").fill("20");
  await page.getByTestId("rev-correct").fill("25");
  await page.getByTestId("rev-submit").click();
  await expect(page.getByTestId("rev-form").getByRole("alert")).toHaveText(/can't be more than the questions you solved/i);
  await page.getByTestId("rev-correct").fill("15");
  await expect(page.getByTestId("rev-live-accuracy")).toHaveText("That's 75% accuracy.");
  await page.getByTestId("rev-errors").fill("Forgot the sign convention for projectile motion");
  await shot("revision-form");
  if (mobile) {
    await expectTapTargets(page, '[data-testid^="rev-type-"], [data-testid^="rev-preset-"]');
    await noHorizontalScroll(page);
  }
  await page.getByTestId("rev-submit").click();
  await expect(page.getByTestId("toast")).toContainText("Logged: 45m of revision");

  // ── analytics ───────────────────────────────────────────────────────────────
  await page.getByTestId("revision-tab-analytics").click();
  await expect(page.getByTestId("revision-analytics")).toBeVisible();
  await expect(page.getByTestId("rev-total-count")).toHaveText("1");
  await expect(page.getByTestId("rev-total-minutes")).toHaveText("45m");
  await expect(page.getByTestId("rev-total-accuracy")).toHaveText("75%");
  const tile = page.getByTestId("revision-heatmap").locator('[data-status="fresh"]');
  await expect(tile).toHaveCount(1);
  await expect(tile).toContainText("Kinematics");
  await expect(tile).toContainText("today");
  await expect(page.getByTestId("accuracy-bars")).toBeVisible();
  await shot("revision-analytics");
  if (mobile) await noHorizontalScroll(page);

  // week / month / all all answer
  await page.getByTestId("period-all").click();
  await expect(page.getByTestId("rev-total-count")).toHaveText("1");

  // ── history → add it to the planner ────────────────────────────────────────
  await page.getByTestId("revision-tab-history").click();
  const row = page.locator('[data-testid^="revision-row-"]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Kinematics");
  await expect(row).toContainText("75%");
  await row.locator('[data-testid^="revision-plan-"]').click();
  await expect(page.getByTestId("planner-picker")).toBeVisible();
  await page.getByTestId("picker-slot-EVENING").click();
  await shot("revision-planner-picker");
  if (mobile) await expectTapTargets(page, '[data-testid^="picker-slot-"], [data-testid="picker-confirm"]');
  await page.getByTestId("picker-confirm").click();
  await expect(page.getByTestId("toast")).toContainText(/Added to (today's plan|your planner)/);
  await expect(page.getByTestId("planner-picker")).toHaveCount(0);

  // the hub now counts it
  await page.goto("/logs");
  await expect(page.getByTestId("hub-revision-value")).toHaveText("1");
});

test("backlog: add an item → schedule it → it is on today's plan; clear it → analytics follow", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-3-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);

  await generateTodayPlan(page); // so "Add to planner" for today goes straight into the plan
  await page.goto("/logs/backlog");
  await expect(page.getByTestId("backlog-page")).toBeVisible();
  await expect(page.getByTestId("backlog-empty")).toBeVisible();
  await expect(page.getByTestId("open-count")).toHaveText("(0)");
  await shot("backlog-empty");
  if (mobile) await noHorizontalScroll(page);

  // ── add ─────────────────────────────────────────────────────────────────────
  await page.getByTestId("backlog-tab-add").click();
  await page.getByTestId("bl-submit").click();
  await expect(page.getByTestId("bl-form").getByRole("alert")).toHaveText(/choose a subject/i);
  await page.getByTestId("bl-subject").selectOption({ label: "Physics" });
  await page.getByTestId("bl-chapter").selectOption({ label: "Kinematics" });
  await page.getByTestId("bl-topic").fill("Projectile motion");
  await page.getByTestId("bl-preset-45").click();
  await page.getByTestId("bl-priority-1").click();
  await shot("backlog-form");
  if (mobile) {
    await expectTapTargets(page, '[data-testid^="bl-priority-"], [data-testid^="bl-preset-"]');
    await noHorizontalScroll(page);
  }
  await page.getByTestId("bl-submit").click();
  await expect(page.getByTestId("toast")).toContainText("Added to your backlog");

  // ── open list ───────────────────────────────────────────────────────────────
  await expect(page.getByTestId("backlog-open-list")).toBeVisible();
  const item = page.locator('[data-testid^="backlog-item-"]');
  await expect(item).toHaveCount(1);
  await expect(item).toContainText("Kinematics");
  await expect(item).toContainText("Urgent");
  await expect(item).toContainText("45m");
  await shot("backlog-open");
  if (mobile) {
    await expectTapTargets(page, '[data-testid^="clear-"], [data-testid^="schedule-"], [data-testid^="edit-"], [data-testid^="drop-"]');
    await noHorizontalScroll(page);
  }

  // ── schedule it for today ───────────────────────────────────────────────────
  await item.locator('[data-testid^="schedule-"]').click();
  await expect(page.getByTestId("planner-picker")).toBeVisible();
  await page.locator('[data-testid^="picker-day-"]').first().click(); // Today
  await page.getByTestId("picker-slot-EVENING").click();
  await page.getByTestId("picker-confirm").click();
  await expect(page.getByTestId("toast")).toContainText(/Added to today's plan|Scheduled/);
  await expect(page.locator('[data-testid^="scheduled-"]')).toContainText("Scheduled · Today");

  // ── it is on today's plan: pinned on the calendar, and in the task list on Home ──────────
  await page.goto("/plan");
  await expect(page.getByText("Custom", { exact: true }).first()).toBeVisible();
  await shot("plan-calendar-pinned");
  await page.goto("/home");
  await expect(page.getByText("Backlog: Kinematics").first()).toBeVisible({ timeout: 60_000 });
  await shot("home-with-backlog");
  if (mobile) await noHorizontalScroll(page);

  // ── clear it: the open list empties, history and analytics follow ──────────
  await page.goto("/logs/backlog");
  await page.locator('[data-testid^="clear-"]').click();
  await expect(page.getByTestId("toast")).toContainText("Cleared");
  await expect(page.locator('[data-testid^="backlog-item-"]')).toHaveCount(0);

  await page.getByTestId("backlog-tab-analytics").click();
  await expect(page.getByTestId("clearance-rate")).toHaveText("100%");
  await expect(page.getByTestId("backlog-cleared-count")).toHaveText("1");
  await expect(page.getByTestId("backlog-timeline")).toBeVisible();
  await shot("backlog-analytics");
  if (mobile) await noHorizontalScroll(page);

  await page.getByTestId("backlog-tab-history").click();
  await expect(page.locator('[data-testid^="history-item-"]')).toHaveCount(1);
  await expect(page.locator('[data-testid^="history-item-"]')).toContainText(/Cleared (in \d+ days?|the same day)/);
  await expect(page.getByTestId("history-avg")).toBeVisible();
});

test("practice: log a session (the sum is checked) → the weekly accuracy chart, weakness map and share card follow", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-3-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);

  await page.goto("/logs/practice");
  await expect(page.getByTestId("practice-page")).toBeVisible();
  await page.getByTestId("prac-subject").selectOption({ label: "Physics" });
  await page.getByTestId("prac-chapter").selectOption({ label: "Kinematics" });
  await page.getByTestId("prac-source").selectOption({ label: "HC Verma" });
  await page.getByTestId("prac-correct").fill("7");
  await page.getByTestId("prac-wrong").fill("2");
  await page.getByTestId("prac-skipped").fill("1");

  // attempted fills itself and the sum is shown
  await expect(page.getByTestId("prac-attempted")).toHaveValue("10");
  await expect(page.getByTestId("prac-sum-status")).toContainText("Adds up: 7 + 2 + 1 = 10 · 70% accuracy");

  // typing a different attempted count is refused, with the numbers spelled out
  await page.getByTestId("prac-attempted").fill("12");
  await expect(page.getByTestId("prac-sum-status")).toContainText("7 + 2 + 1 = 10, but you attempted 12");
  await page.getByTestId("prac-submit").click();
  await expect(page.getByTestId("prac-form").getByRole("alert")).toContainText("2 questions are not counted");
  await shot("practice-sum-mismatch");
  if (mobile) await noHorizontalScroll(page);

  // …and one tap puts it right
  await page.getByTestId("prac-auto-attempted").click();
  await expect(page.getByTestId("prac-attempted")).toHaveValue("10");
  await page.getByTestId("prac-minutes").fill("25");
  await page.getByTestId("prac-difficulty-medium").click();
  await shot("practice-form");
  if (mobile) await expectTapTargets(page, '[data-testid^="prac-difficulty-"], [data-testid="prac-submit"]');
  await page.getByTestId("prac-submit").click();
  await expect(page.getByTestId("toast")).toContainText("Logged: 7/10 (70%)");

  // ── sessions ────────────────────────────────────────────────────────────────
  await page.getByTestId("practice-tab-sessions").click();
  const row = page.locator('[data-testid^="practice-row-"]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Kinematics");
  await expect(row).toContainText("HC Verma");
  await expect(page.locator('[data-testid^="practice-score-"]')).toContainText("7/10");

  // ── analytics: the weekly accuracy chart, the weakness heatmap, speed and sources ─
  await page.getByTestId("practice-tab-analytics").click();
  await expect(page.getByTestId("practice-analytics")).toBeVisible();
  await expect(page.getByTestId("prac-total-questions")).toHaveText("10");
  await expect(page.getByTestId("prac-total-accuracy")).toHaveText("70%");
  await expect(page.getByTestId("weekly-accuracy")).toBeVisible();
  const weak = page.locator('[data-testid^="weak-"]');
  await expect(weak).toHaveCount(1);
  await expect(weak).toHaveAttribute("data-band", "yellow"); // 70 % is yellow (50–75)
  await expect(weak).toContainText("Kinematics");
  await expect(page.getByTestId("speed-medium")).toContainText("0.4/min");
  await expect(page.getByTestId("source-donut")).toBeVisible();
  await expect(page.getByTestId("day-strip")).toBeVisible();
  await shot("practice-analytics");
  if (mobile) await noHorizontalScroll(page);

  // ── share card ──────────────────────────────────────────────────────────────
  await page.getByTestId("practice-tab-share").click();
  await expect(page.getByTestId("share-preview").locator("canvas")).toBeVisible();
  const box = await page.getByTestId("share-preview").locator("canvas").boundingBox();
  expect(box!.height / box!.width).toBeCloseTo(16 / 9, 1); // 9:16 portrait
  await expect(page.getByTestId("share-preview").locator("canvas")).toHaveAttribute("aria-label", /70% accuracy over 10 questions/);
  await shot("practice-share");
  if (mobile) {
    await expectTapTargets(page, '[data-testid="share-download"], [data-testid="share-share"]');
    await noHorizontalScroll(page);
  }
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("share-download").click()]);
  expect(download.suggestedFilename()).toMatch(/^prepex-.*-week\.png$/);
  const path = await download.path();
  const png = readFileSync(path);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.length).toBeGreaterThan(5_000);
  await expect(page.getByTestId("toast")).toContainText("Saved your card");

  // the hub shows this week's accuracy
  await page.goto("/logs");
  await expect(page.getByTestId("hub-practice-value")).toHaveText("70%");
});
