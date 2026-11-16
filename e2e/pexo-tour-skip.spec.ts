import { createHash, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { queryDb } from "./helpers";

/**
 * Pre-step 3, gap b: a student who skips Pexo's tour and reloads straight away must not see it again. The skip is now
 * saved on the server the moment the tour closes (POST /api/pexo/batch), not on the next minute heartbeat.
 */
const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";
const AUTH = process.env.E2E_AUTH_URL ?? CORE.replace(/:(\d+)$/, (_, p) => `:${Number(p) - 1}`);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const CODE = "975310";

test("skip the tour → reload at once → the tour stays away, and the skip is on the server", async ({ page, request }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real accounts: desktop project only");
  const email = `pre3.tour.${Date.now()}@test.prepex.io`;
  queryDb("INSERT INTO auth.email_login_codes (id, email, code_hash, expires_at, created_at) VALUES ($1, $2, $3, now() + interval '10 minutes', now())", [randomUUID(), email, sha256(CODE)]);
  const v = (await (await request.post(`${AUTH}/api/auth/email-code/verify`, { data: { email, code: CODE, fullName: "Tour Student" } })).json()).data;
  const [exam] = queryDb<{ id: string }>("SELECT id FROM dashboard.exams WHERE is_active ORDER BY (code = 'JEE_MAIN') DESC, code LIMIT 1");
  const blocks = Array.from({ length: 7 }, (_, d) => ({ dayOfWeek: d, startTime: "16:00", endTime: "21:00", activityType: "SELF_STUDY" }));
  const done = await request.post(`${CORE}/api/onboarding/complete`, {
    headers: { Authorization: `Bearer ${v.tokens.accessToken}` },
    data: { examId: exam!.id, fullName: "Tour Student", targetExamDate: "2027-01-24", examDateIsDefault: true, currentLevel: "CLASS_12", coachingType: "SELF_PREP", timetable: { uniformWeek: true, source: "COACHING_TEMPLATE", blocks }, completedChapterIds: [], ageBand: "17" },
  });
  expect(done.status()).toBe(200);

  await page.addInitScript((x) => {
    if (sessionStorage.getItem("e2e-signed-in")) return;
    sessionStorage.setItem("e2e-signed-in", "1");
    localStorage.setItem("prepex_access_token", x.tokens.accessToken);
    localStorage.setItem("prepex_refresh_token", x.tokens.refreshToken);
    localStorage.setItem("prepex_user", JSON.stringify(x.user));
  }, v);
  await page.goto("/home");
  const checkIn = page.getByText("Skip for today");
  if (await checkIn.waitFor({ timeout: 8000 }).then(() => true, () => false)) await checkIn.click();

  // a new student meets the tour once
  await expect(page.getByTestId("pexo-tour")).toBeVisible({ timeout: 60_000 });
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/pexo/batch") && r.request().method() === "POST");
  const skippedAt = Date.now();
  await page.getByTestId("pexo-tour-skip").click();
  expect((await saved).status()).toBe(200);
  expect(queryDb<{ t: boolean }>("SELECT (marks ? 'tour') AS t FROM core.pexo_users WHERE user_id = $1", [v.user.id])[0]?.t).toBe(true);

  // reload straight away (well inside the old one-minute heartbeat window): no tour
  await page.reload();
  await expect(page.getByTestId("home-top")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(4000); // the tour opens within a moment of Home loading when it is due
  await expect(page.getByTestId("pexo-tour")).toHaveCount(0);
  expect(Date.now() - skippedAt, "the reload happened before any heartbeat could have carried the skip").toBeLessThan(60_000);
});
