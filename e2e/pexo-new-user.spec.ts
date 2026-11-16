import { expect, test, type Page } from "@playwright/test";
import { EMAIL, onboardAndEnterApp, queryDb, resetStudent } from "./helpers";

/**
 * Pexo for every new user, end to end against the REAL local stack (auth 4001, core 4002, dashboard 4003, prepex_dev):
 *
 *   1. the retired sign-up pages hand over to /start;
 *   2. a student who finished onboarding without Pexo -> "Meet Pexo" once -> everything visible.
 *
 */

test.describe.configure({ mode: "serial" });


async function skipDialogsUntilHome(page: Page) {
  await page.waitForURL((u) => u.pathname === "/home", { timeout: 90_000 });
}

// Launch step 2 (1a): the old password sign-up is retired; new students start at /start (covered by the onboarding-v2 specs).
test("the old sign-up pages send new students to /start", async ({ page }) => {
  for (const path of ["/create-account", "/email-verification", "/register"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/start/, { timeout: 30_000 });
  }
});

test("a student who onboarded without Pexo meets Pexo once, then sees everything", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "the seeded student is shared between projects");
  resetStudent();
  await onboardAndEnterApp(page, { keepOverlays: true }); // this spec is about the tour itself
  // make this student look like one who went through onboarding before they had Pexo
  queryDb("DELETE FROM core.pexo_events WHERE user_id = (SELECT id FROM core.users WHERE email = $1) AND name = 'onboarding_step_completed'", [EMAIL]);
  queryDb("UPDATE core.pexo_users SET marks = '{}'::jsonb WHERE user_id = (SELECT id FROM core.users WHERE email = $1)", [EMAIL]);
  await page.reload();
  await skipDialogsUntilHome(page);

  const tour = page.getByTestId("pexo-tour");
  await expect(tour).toHaveAttribute("data-stage", "hello-0", { timeout: 60_000 });
  await expect(page.getByTestId("pexo-tour-text")).toContainText("Hi, I'm Pexo");
  await page.getByTestId("pexo-tour-skip").click();
  await expect(page.getByTestId("home-pexo")).toBeVisible();
  await expect(page.getByTestId("prepex-map")).toBeVisible();
  await expect(page.getByTestId("home-climb-strip")).toBeVisible();

  // once: a reload does not bring it back (the heartbeat stored the mark)
  await page.waitForTimeout(65_000);
  await page.reload();
  await expect(page.getByTestId("home-pexo")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("pexo-tour")).toHaveCount(0);
});
