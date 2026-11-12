import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { EMAIL, onboardAndEnterApp, queryDb, resetStudent } from "./helpers";

/**
 * Pexo for every new user, end to end against the REAL local stack (auth 4001, core 4002, dashboard 4003, prepex_dev):
 *
 *   1. a brand-new signup through the real sign-up + OTP screens -> onboarding with Pexo's narration -> the tour ->
 *      Home with Pexo, the Prepex map and "Your climb";
 *   2. a student who finished onboarding without Pexo -> "Meet Pexo" once -> everything visible.
 *
 * The OTP: the local auth service e-mails a random code and keeps only its hash, so the test writes the hash of a
 * known test code into the LOCAL database (the helpers refuse anything but localhost).
 */

test.describe.configure({ mode: "serial" });

const TEST_OTP = "246810";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function skipDialogsUntilHome(page: Page) {
  await page.waitForURL((u) => u.pathname === "/home", { timeout: 90_000 });
}

test("a brand-new signup gets Pexo from the first onboarding screen", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "one real signup per run is enough");
  const email = `pexo.new.${Date.now()}@test.prepex.io`;
  await page.goto("/create-account");
  await page.getByPlaceholder("Rohan Sharma").fill("Pexo Newcomer");
  await page.getByPlaceholder("Rohan@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("E2eTest!234");
  await page.getByRole("button", { name: "Sign up" }).click();

  // the real OTP screen; the code the server stored is replaced with the test code (local database only)
  await expect(page).toHaveURL(/email-verification/, { timeout: 30_000 });
  queryDb("UPDATE auth.email_otps SET otp_hash = $1 WHERE user_id = (SELECT id FROM auth.users WHERE email = $2)", [sha256(TEST_OTP), email]);
  await page.locator("input[inputmode='numeric']").first().click();
  await page.keyboard.type(TEST_OTP);
  await page.getByRole("button", { name: "Verify & Continue" }).click();

  // onboarding: Pexo narrates from the very first step
  await expect(page.getByRole("heading", { name: /I.m preparing for/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("onboarding-pexo")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("onboarding-pexo")).toContainText("Hi, I'm Pexo");

  const [user] = queryDb<{ id: string }>("SELECT id FROM auth.users WHERE email = $1", [email]);
  expect(user).toBeTruthy();
});

test("a student who onboarded without Pexo meets Pexo once, then sees everything", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "the seeded student is shared between projects");
  resetStudent();
  await onboardAndEnterApp(page);
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
