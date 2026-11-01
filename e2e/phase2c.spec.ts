import { expect, test } from "@playwright/test";
import { expectTapTargets, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

test.describe.configure({ mode: "serial" });

test("focus: start → pause/resume → stop → the time lands in the study log", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-2c-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);

  // Five tabs: Study opens the hub, Focus has its own tab. /focus is gone: it redirects to the one timer.
  await page.goto("/focus");
  await expect(page).toHaveURL(/\/focus\/start\?origin=standalone/);
  await expect(page.getByTestId("focus-setup")).toBeVisible();
  const nav = mobile ? page.getByRole("navigation", { name: "Primary" }) : page.locator("aside nav");
  await expect(nav.getByRole("link", { name: "Study" }).first()).toHaveAttribute("href", "/logs");
  await expect(nav.getByRole("link", { name: "Focus" }).first()).toHaveAttribute("href", "/focus/start?origin=standalone");
  await expect(nav.first().getByRole("link")).toHaveCount(5);
  if (mobile) {
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

test("notebooks: a mistake page lands in its chapter notebook, gets a reason, and comes back for review", async ({ page }, info) => {
  test.setTimeout(180_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-2c-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);

  // Old addresses land on the one hub
  await page.goto("/mistakes");
  await expect(page).toHaveURL(/\/notebooks$/);
  await expect(page.getByTestId("notebooks-shelf")).toBeVisible();
  await expect(page.getByTestId("shelf-empty")).toBeVisible();
  await shot("notebooks-empty");
  if (mobile) await noHorizontalScroll(page);

  // New notebook of the student's own, then a first mistake page in it
  await page.getByTestId("new-notebook").click();
  await page.getByTestId("new-notebook-title").fill("Formula sheet");
  await page.getByTestId("new-notebook-save").click();
  await expect(page.getByTestId("notebook-view")).toBeVisible();
  await page.getByTestId("add-page").click();
  await expect(page.getByTestId("entry-page")).toBeVisible();

  // Header: reason chip, fix line, saved quietly
  await page.getByTestId("reason-silly_calculation").click();
  await page.getByTestId("entry-fix").fill("Check units before squaring");
  await expect(page.getByTestId("save-state")).toHaveText("Saved");
  await shot("notebooks-page");

  // The shelf shows it, and a search on the fix text finds it
  await page.goto("/notebooks");
  await expect(page.getByTestId("notebook-cover")).toHaveCount(1);
  await page.getByTestId("shelf-search").fill("units before");
  await expect(page.getByTestId("search-result")).toHaveCount(1);
  await shot("notebooks-search");
});
