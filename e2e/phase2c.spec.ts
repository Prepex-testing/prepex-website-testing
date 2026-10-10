import { expect, test } from "@playwright/test";
import { expectTapTargets, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

test.describe.configure({ mode: "serial" });

test("focus: start → pause/resume → stop → the time lands in the study log", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-2c-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);

  // The Study tab leads to Focus and is highlighted on all three study screens.
  await page.goto("/focus");
  await expect(page.getByTestId("focus-setup")).toBeVisible();
  const nav = mobile ? page.getByRole("navigation", { name: "Primary" }) : page.locator("aside nav");
  await expect(nav.getByRole("link", { name: "Study" }).first()).toHaveAttribute("href", "/focus");
  if (mobile) {
    await expectTapTargets(page, '[data-testid="study-tabs"] a');
    await expectTapTargets(page, '[data-testid="start-focus"], [data-testid^="preset-"]');
    await noHorizontalScroll(page);
  }
  await shot("focus-setup");

  // Setup
  await expect(page.getByTestId("start-focus")).toBeDisabled();
  await page.getByTestId("focus-subject").selectOption({ label: "Physics" });
  await page.getByTestId("focus-chapter").selectOption({ label: "Kinematics" });
  await page.getByLabel(/topic/i).fill("Projectile motion");
  await page.getByTestId("preset-15").click();
  await page.getByTestId("start-focus").click();

  // Running
  await expect(page.getByTestId("focus-running")).toBeVisible();
  await expect(page.getByTestId("focus-ring")).toBeVisible();
  await expect(page.getByTestId("focus-clock")).toHaveText(/^1[45]:\d\d$/);
  await shot("focus-running");
  if (mobile) await noHorizontalScroll(page);

  // A reload mid-session picks the same session back up (hydrated from the server).
  await page.reload();
  await expect(page.getByTestId("focus-running")).toBeVisible();

  // Pause freezes the clock; resume continues it.
  await page.getByTestId("pause-focus").click();
  await expect(page.getByTestId("resume-focus")).toBeVisible();
  const frozen = await page.getByTestId("focus-clock").textContent();
  await page.waitForTimeout(2200);
  expect(await page.getByTestId("focus-clock").textContent()).toBe(frozen);
  await page.getByTestId("resume-focus").click();
  await expect(page.getByTestId("pause-focus")).toBeVisible();

  // Focus for just over half a minute so the server credits a minute (it rounds to whole minutes).
  await page.waitForTimeout(34_000);

  // Stop → summary → "win" → save
  await page.getByTestId("stop-focus").click();
  await expect(page.getByTestId("focus-summary")).toBeVisible();
  await expect(page.getByTestId("summary-planned")).toHaveText("15m");
  await expect(page.getByTestId("summary-actual")).toHaveText("1m");
  await expect(page.getByTestId("win-no")).toHaveAttribute("aria-checked", "true"); // 1 of 15 minutes is not a win by default
  await page.getByTestId("win-yes").click();
  await shot("focus-summary");
  await page.getByTestId("save-session").click();

  await expect(page.getByTestId("focus-done")).toBeVisible();
  await expect(page.getByTestId("focus-done-text")).toContainText("1m added to your study log");
  await expect(page.getByTestId("stat-today")).toHaveText("1m");
  await expect(page.getByTestId("stat-streak")).toHaveText("1 day");

  // The study log has the Focus Mode row, and it is read-only.
  await page.goto("/sessions");
  await expect(page.getByTestId("sessions-page")).toBeVisible();
  const focusRow = page.locator('[data-testid="log-row"][data-source="focus_mode"]');
  await expect(focusRow).toHaveCount(1);
  await expect(focusRow).toContainText("Physics");
  await expect(focusRow).toContainText("Kinematics");
  await expect(focusRow.getByTestId("log-minutes")).toHaveText("1m");
  await expect(focusRow.getByRole("button")).toHaveCount(0);
  await expect(page.getByTestId("chart-total")).toContainText("1m across 1 session");
  await shot("sessions");
  if (mobile) await noHorizontalScroll(page);

  // Manual logging: add, edit, delete.
  await page.getByTestId("log-subject").selectOption({ label: "Maths" });
  await page.getByTestId("log-preset-30").click();
  await page.getByLabel("Notes (optional)").first().fill("solved limits");
  await page.getByTestId("log-submit").click();
  const manualRow = page.locator('[data-testid="log-row"][data-source="manual"]');
  await expect(manualRow).toHaveCount(1);
  await expect(manualRow.getByTestId("log-minutes")).toHaveText("30m");
  await expect(page.getByTestId("chart-total")).toContainText("31m across 2 sessions");

  await manualRow.getByRole("button", { name: "Edit this entry" }).click();
  await page.getByTestId("edit-minutes").fill("45");
  await page.getByTestId("edit-submit").click();
  await expect(manualRow.getByTestId("log-minutes")).toHaveText("45m");

  await manualRow.getByRole("button", { name: "Delete this entry" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(manualRow).toHaveCount(0);
  await expect(page.getByTestId("chart-total")).toContainText("1m across 1 session");
});

test("mistakes: add → review now → mastered, with the stats following along", async ({ page }, info) => {
  test.setTimeout(180_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-2c-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);

  await page.goto("/mistakes");
  await expect(page.getByTestId("mistakes-page")).toBeVisible();
  await expect(page.getByTestId("queue-empty")).toBeVisible(); // nothing due yet
  await shot("mistakes-empty");
  if (mobile) {
    await expectTapTargets(page, '[data-testid^="tab-"], [data-testid="add-mistake"]');
    await noHorizontalScroll(page);
  }

  // Add
  await page.getByTestId("add-mistake").click();
  await page.getByTestId("mistake-subject").selectOption({ label: "Physics" });
  await page.getByTestId("mistake-chapter").selectOption({ label: "Laws of Motion" });
  await page.getByTestId("mistake-question").fill("A 2 kg block is pushed with 10 N on a frictionless floor. What is its acceleration?");
  await page.getByTestId("mistake-correct").fill("5 m/s^2");
  await page.getByTestId("mistake-mine").fill("20 m/s^2");
  await page.getByTestId("mistake-tags").fill("silly, mechanics");
  await page.getByTestId("mistake-submit").click();
  await expect(page.getByTestId("mistakes-notice")).toContainText("comes up for review tomorrow");

  // It is in the list, due tomorrow
  await page.getByTestId("tab-all").click();
  const row = page.getByTestId("mistake-row");
  await expect(row).toHaveCount(1);
  await expect(row.getByTestId("next-review")).toContainText("Next review tomorrow");
  await expect(row).toContainText("silly");
  await shot("mistakes-list");
  if (mobile) await noHorizontalScroll(page);

  // Search narrows the list
  await page.getByTestId("mistake-search").fill("zzz-no-match");
  await expect(page.getByTestId("mistakes-empty")).toBeVisible();
  await page.getByTestId("mistake-search").fill("block");
  await expect(row).toHaveCount(1);

  // Review it now (practice early): answer hidden until revealed
  await row.getByTestId("review-now").click();
  await expect(page.getByTestId("review-card")).toBeVisible();
  await expect(page.getByTestId("review-answer")).toHaveCount(0);
  await page.getByTestId("reveal-answer").click();
  await expect(page.getByTestId("review-answer")).toContainText("5 m/s^2");
  await expect(page.getByTestId("review-answer")).toContainText("20 m/s^2");
  await shot("mistakes-review");
  await page.getByTestId("rate-good").click();
  await expect(page.getByTestId("mistakes-notice")).toContainText("in 3 days");
  await expect(row.getByTestId("next-review")).toContainText("Next review in 3 days");
  await expect(row.getByTestId("next-review")).toContainText("reviewed 1 time");

  // Master it
  await row.getByTestId("master").click();
  await expect(row).toHaveAttribute("data-mastered", "true");
  await expect(row.getByTestId("reopen")).toBeVisible();

  // Stats followed along
  await page.getByTestId("tab-stats").click();
  await expect(page.getByTestId("stat-total")).toHaveText("1");
  await expect(page.getByTestId("stat-mastered-pct")).toHaveText("100%");
  await expect(page.getByTestId("stat-streak")).toHaveText("1 day");
  await shot("mistakes-stats");

  // Reopen puts it back in the queue (due tomorrow, so not "due today" yet)
  await page.getByTestId("tab-all").click();
  await row.getByTestId("reopen").click();
  await expect(row).toHaveAttribute("data-mastered", "false");
});
