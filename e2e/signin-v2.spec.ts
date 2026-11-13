import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { EMAIL, PASSWORD, queryDb } from "./helpers";

/**
 * Onboarding v2, Part B — against the REAL local stack. The flags answer is intercepted per test, so the same stack
 * shows both the new sign-in (ONBOARDING_V2 on) and the old login page untouched (off). The e-mailed code is replaced
 * in the LOCAL database by the hash of a known test code (the helpers refuse anything but localhost).
 */
const TEST_CODE = "135790";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function flags(page: Page, onboardingV2: boolean, guestMode = false) {
  await page.addInitScript(() => window.localStorage.removeItem("prepex:auth-flags"));
  await page.route("**/api/auth/flags", (r) => r.fulfill({ json: { success: true, data: { onboardingV2, guestMode } } }));
}

test("ONBOARDING_V2 off: /login is the old page, exactly", async ({ page }) => {
  await flags(page, false);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByPlaceholder("Enter password")).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/login$/);
  // and the new address sends people back to it
  await page.goto("/start");
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
});

test("ONBOARDING_V2 on: Pexo sign-in, a new e-mail gets a code and lands in onboarding with no password", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "one real signup per run is enough");
  await flags(page, true);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/start$/, { timeout: 15_000 });
  await expect(page.getByTestId("onb-pexo-text")).toHaveText("Hi, I'm Pexo. Let's get you set up in about a minute.");
  await expect(page.getByTestId("signin-guest")).toHaveCount(0);

  const email = `v2.code.${Date.now()}@test.prepex.io`;
  await page.getByTestId("signin-email").click();
  await page.getByPlaceholder("Rohan@example.com").fill(email);
  await page.getByTestId("signin-send-code").click();
  await expect(page.getByTestId("signin-code")).toBeVisible({ timeout: 20_000 });
  queryDb("UPDATE auth.email_login_codes SET code_hash = $1 WHERE email = $2", [sha256(TEST_CODE), email]);
  await page.getByTestId("signin-code").fill(TEST_CODE);
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 });

  const [row] = queryDb<{ password_hash: string | null; is_verified: boolean }>("SELECT password_hash, is_verified FROM auth.users WHERE email = $1", [email]);
  expect(row).toMatchObject({ password_hash: null, is_verified: true });
});

test("ONBOARDING_V2 on: existing students still log in with their password", async ({ page }) => {
  await flags(page, true);
  await page.goto("/start");
  await page.getByTestId("signin-password").click();
  await expect(page).toHaveURL(/\/login\?password=1/);
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/login\?password=1/);
  await page.getByPlaceholder("Rohan@example.com").fill(EMAIL);
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
});

test("ONBOARDING_V2 on with guest mode: Try Prepex first is offered with Pexo's note", async ({ page }) => {
  await flags(page, true, true);
  await page.goto("/start");
  await expect(page.getByTestId("signin-guest")).toBeVisible();
  await expect(page.getByTestId("signin-guest-note")).toHaveText("Just looking? Try Prepex first. You can save your progress any time.");
});
