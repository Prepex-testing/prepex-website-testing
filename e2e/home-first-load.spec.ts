import { expect, test } from "@playwright/test";
import { onboardAndEnterApp, resetStudent } from "./helpers";

/**
 * Onboarding v2, A6 — against the REAL local stack (auth 4001, core 4002, dashboard 4003, prepex_dev): a freshly
 * onboarded account's very first Home load shows the plan, the exam countdown, the streak and the level, with no
 * error and none of the old misleading fallbacks ("Set a date", "-", an empty Level bar).
 */
test("a freshly onboarded student's first Home load shows plan, countdown, streak and level", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "the seeded student is shared between projects");
  resetStudent();
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/") && r.status() >= 400 && r.status() !== 401) failures.push(`${r.status()} ${r.url()}`);
  });

  await onboardAndEnterApp(page);
  await page.waitForURL((u) => u.pathname === "/home", { timeout: 90_000 });

  // the plan is there (built at onboarding completion), not "Couldn't build your plan"
  await expect(page.getByText(/Couldn.t build your plan/)).toHaveCount(0);
  await expect(page.getByTestId("home-level")).toContainText(/Level \d+/, { timeout: 30_000 });
  await expect(page.getByTestId("home-streak")).toContainText(/\d+\s*day/);
  const countdown = page.getByTestId("days-left");
  await expect(countdown).toContainText(/JEE (Main|Advanced)/);
  await expect(countdown).not.toContainText("Set a date");
  await expect(page.getByTestId("home-inline-error")).toHaveCount(0);
  // the date comes from the server
  await expect(page.getByTestId("home-date")).toHaveText(/\w+ \d{1,2} \w+/);

  expect(failures, failures.join("\n")).toEqual([]);
});
