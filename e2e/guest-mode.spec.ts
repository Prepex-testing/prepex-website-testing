import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { queryDb } from "./helpers";

/**
 * Onboarding v2, Part D (D1, D2, D4) against the REAL local stack, with auth-service started with ONBOARDING_V2=on and
 * GUEST_MODE=on (local only). Try Prepex first -> a guest account onboarded with the defaults -> Home with one ask card;
 * the server refuses social features to the guest.
 */
test("Try Prepex first: a guest lands on Home with the defaults, one ask card, and no social features", async ({ page, request }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real accounts: desktop project only");
  await page.addInitScript(() => window.localStorage.removeItem("prepex:auth-flags"));
  await page.goto("/start");
  await page.getByTestId("signin-guest").click();
  await expect(page).toHaveURL(/\/(home|check-in)/, { timeout: 60_000 });
  // the daily check-in comes first, as for every student
  const skipCheckIn = page.getByText("Skip for today");
  if (await skipCheckIn.waitFor({ timeout: 30_000 }).then(() => true, () => false)) await skipCheckIn.click();
  await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });

  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      const v = localStorage.getItem(k) ?? "";
      if (/access/i.test(k) && v.split(".").length === 3) return v;
    }
    return null;
  });
  expect(token).toBeTruthy();
  const userId = JSON.parse(Buffer.from(token!.split(".")[1]!, "base64url").toString()).userId as string;

  // D1: a real account, flagged as a guest in both places, onboarded with the defaults
  const [user] = queryDb<{ email: string; is_guest: boolean }>("SELECT email, is_guest FROM auth.users WHERE id = $1", [userId]);
  expect(user!.is_guest).toBe(true);
  expect(user!.email).toMatch(/@guest\.prepex\.invalid$/);
  const [mirror] = queryDb<{ is_guest: boolean; current_level: string; coaching_type: string }>(
    "SELECT u.is_guest, p.current_level, p.coaching_type FROM core.users u JOIN core.user_profiles p ON p.user_id = u.id WHERE u.id = $1",
    [userId],
  );
  expect(mirror).toMatchObject({ is_guest: true, current_level: "CLASS_12", coaching_type: "SELF_PREP" });
  const [events] = queryDb<{ n: string }>("SELECT count(*)::text AS n FROM core.onboarding_events WHERE user_id = $1 AND cohort = 'guest'", [userId]);
  expect(Number(events!.n)).toBeGreaterThanOrEqual(1);

  // Pexo's 60-second tour opens for a new account; skip it like a student can
  const tourSkip = page.getByTestId("pexo-tour-skip");
  if (await tourSkip.waitFor({ timeout: 20_000 }).then(() => true, () => false)) await tourSkip.click();

  // D2: one ask card, answered through the profile service
  await expect(page.getByTestId("guest-ask")).toHaveAttribute("data-ask", "class", { timeout: 30_000 });
  await page.getByTestId("guest-ask").getByText("Class 11").click();
  await expect(page.getByTestId("guest-ask")).toHaveCount(0);
  const [after] = queryDb<{ current_level: string }>("SELECT current_level FROM core.user_profiles WHERE user_id = $1", [userId]);
  expect(after!.current_level).toBe("CLASS_11");
  await page.reload();
  await expect(page.getByTestId("home-top")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("guest-ask")).toHaveCount(0); // one card a session

  // D4: the server refuses social features, whatever the app shows
  const core = process.env.E2E_CORE_URL ?? "http://localhost:4002";
  const duel = await request.post(`${core}/api/pexo/duels`, { headers: { Authorization: `Bearer ${token}` }, data: {} });
  expect(duel.status()).toBe(403);
  expect(await duel.json()).toMatchObject({ code: "guest_locked" });

  // D3: save the guest with an e-mail code, from the menu. Same account, nothing lost.
  const email = `guest.save.${Date.now()}@test.prepex.io`;
  await page.goto("/home?save=1");
  await expect(page.getByTestId("save-sheet")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("save-email").click();
  await page.getByTestId("save-name").fill("Asha Rao");
  await page.getByTestId("save-address").fill(email);
  await page.getByTestId("save-send-code").click();
  await expect(page.getByTestId("save-code")).toBeVisible({ timeout: 20_000 });
  queryDb("UPDATE auth.email_login_codes SET code_hash = $1 WHERE email = $2", [createHash("sha256").update("314159").digest("hex"), email]);
  await page.getByTestId("save-code").fill("314159");
  // back on Home, Pexo says guest.saved
  await expect(page.getByTestId("guest-saved")).toHaveText("Saved. Your climb is safe now.", { timeout: 30_000 });

  const [savedAuth] = queryDb<{ id: string; email: string; is_guest: boolean; full_name: string }>("SELECT id, email, is_guest, full_name FROM auth.users WHERE id = $1", [userId]);
  expect(savedAuth).toMatchObject({ id: userId, email, is_guest: false, full_name: "Asha Rao" });
  const [savedCore] = queryDb<{ email: string; is_guest: boolean; current_level: string }>(
    "SELECT u.email, u.is_guest, p.current_level FROM core.users u JOIN core.user_profiles p ON p.user_id = u.id WHERE u.id = $1",
    [userId],
  );
  // the class answered as a guest is still there: the same account, every answer kept
  expect(savedCore).toMatchObject({ email, is_guest: false, current_level: "CLASS_11" });

  // the locks are gone for the saved account
  const fresh = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      const v = localStorage.getItem(k) ?? "";
      if (/access/i.test(k) && v.split(".").length === 3) return v;
    }
    return null;
  });
  const now = await request.get(`${core}/api/social/studying-now`, { headers: { Authorization: `Bearer ${fresh}` } });
  expect(now.status()).not.toBe(403);
  // and the menu no longer offers to save
  await page.reload();
  await expect(page.getByTestId("home-top")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("menu-save-account")).toHaveCount(0);
});
