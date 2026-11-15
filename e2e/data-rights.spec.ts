import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { queryDb } from "./helpers";

/**
 * Launch step 2, against the REAL local stack (fresh database):
 *  - A3 Download my data: prepared in the background, downloaded, holds the student's own account;
 *  - A3 Delete account: DELETE + e-mailed code, 7-day grace, undone by signing in, then the full delete leaves no row;
 *  - B  Feedback: sent from Settings with a screenshot, read in the admin inbox and marked resolved.
 * Each test makes its own student through the API (e-mail code + onboarding complete) and opens the app signed in.
 * Codes are replaced in the LOCAL database by hashes of known test codes (the helpers refuse anything but localhost).
 */
const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";
const AUTH = process.env.E2E_AUTH_URL ?? CORE.replace(/:(\d+)$/, (_, p) => `:${Number(p) - 1}`);
const DASH = process.env.E2E_DASHBOARD_URL ?? CORE.replace(/:(\d+)$/, (_, p) => `:${Number(p) + 1}`);
const BACKEND = process.env.E2E_BACKEND_DIR ?? path.resolve(__dirname, "../../prepex-backend-testing");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const CODE = "246813";

type Student = { id: string; email: string; accessToken: string; refreshToken: string; user: unknown };

async function makeStudent(request: APIRequestContext, tag: string): Promise<Student> {
  const email = `step2.${tag}.${Date.now()}@test.prepex.io`;
  queryDb("INSERT INTO auth.email_login_codes (id, email, code_hash, expires_at, created_at) VALUES ($1, $2, $3, now() + interval '10 minutes', now())", [randomUUID(), email, sha256(CODE)]);
  const v = await (await request.post(`${AUTH}/api/auth/email-code/verify`, { data: { email, code: CODE, fullName: "Step Two" } })).json();
  const { accessToken, refreshToken } = v.data.tokens;
  const [exam] = queryDb<{ id: string }>("SELECT id FROM dashboard.exams WHERE is_active ORDER BY (code = 'JEE_MAIN') DESC, code LIMIT 1");
  const blocks = Array.from({ length: 7 }, (_, d) => ({ dayOfWeek: d, startTime: "06:00", endTime: "22:00", activityType: "SELF_STUDY" }));
  const done = await request.post(`${CORE}/api/onboarding/complete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { examId: exam!.id, fullName: "Step Two", targetExamDate: "2027-05-16", examDateIsDefault: true, currentLevel: "CLASS_12", coachingType: "SELF_PREP", timetable: { uniformWeek: true, source: "COACHING_TEMPLATE", blocks }, completedChapterIds: [], ageBand: "17" },
  });
  expect(done.status()).toBe(200);
  return { id: v.data.user.id, email, accessToken, refreshToken, user: v.data.user };
}

async function openSignedIn(page: Page, s: Student, at: string) {
  await page.addInitScript((x) => {
    window.localStorage.setItem("prepex_access_token", x.accessToken);
    window.localStorage.setItem("prepex_refresh_token", x.refreshToken);
    window.localStorage.setItem("prepex_user", JSON.stringify(x.user));
  }, s);
  await page.goto(at);
  const skip = page.getByText("Skip for today");
  if (await skip.waitFor({ timeout: 8000 }).then(() => true, () => false)) {
    await skip.click();
    await page.goto(at);
  }
}

/** Every core table with a user_id column: rows still naming this student. */
function leftovers(userId: string): string[] {
  const tables = queryDb<{ table_name: string }>("SELECT table_name FROM information_schema.columns WHERE table_schema = 'core' AND column_name = 'user_id' AND data_type = 'uuid'");
  return tables.filter((t) => Number(queryDb<{ n: string }>(`SELECT count(*)::text AS n FROM core."${t.table_name}" WHERE user_id = $1`, [userId])[0]!.n) > 0).map((t) => t.table_name);
}

test.describe.configure({ mode: "serial" });

test("A3: Download my data — prepared, downloaded, and it is the student's own", async ({ page, request }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real accounts: desktop project only");
  const s = await makeStudent(request, "export");
  await openSignedIn(page, s, "/profile/settings");
  await page.getByTestId("export-request").click();
  const download = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByTestId("export-download").click({ timeout: 90_000 });
  const file = await (await download).path();
  const body = JSON.parse(readFileSync(file!, "utf8"));
  expect(body.account).toMatchObject({ userId: s.id, email: s.email });
  expect(Object.keys(body.tables)).toEqual(expect.arrayContaining(["user_profiles"]));
  expect(JSON.stringify(body)).not.toMatch(/"(password_hash|token_hash|otp_hash|code_hash)"/);
});

test("A3: Delete account — DELETE + code, 7 days to undo by signing in, then everything is gone", async ({ page, request }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real accounts: desktop project only");
  const s = await makeStudent(request, "delete");
  await openSignedIn(page, s, "/profile/settings");
  await page.getByTestId("delete-open").click();
  await page.getByTestId("delete-typed").fill("DELETE");
  await page.getByTestId("delete-send-code").click();
  await expect(page.getByTestId("delete-code")).toBeVisible({ timeout: 20_000 });
  queryDb("UPDATE auth.email_otps SET otp_hash = $1 WHERE user_id = $2", [sha256(CODE), s.id]);
  await page.getByTestId("delete-code").fill(CODE);
  await page.getByTestId("delete-confirm").click();
  await expect(page).toHaveURL(/deletionScheduled=/, { timeout: 30_000 });
  const [scheduled] = queryDb<{ days: string }>("SELECT round(extract(epoch from (deletion_scheduled_at + interval '7 days' - now())) / 86400)::text AS days FROM auth.users WHERE id = $1", [s.id]);
  expect(scheduled!.days).toBe("7");

  // undo: signing in again with an e-mail code restores the account
  queryDb("INSERT INTO auth.email_login_codes (id, email, code_hash, expires_at, created_at) VALUES ($1, $2, $3, now() + interval '10 minutes', now())", [randomUUID(), s.email, sha256(CODE)]);
  const back = await (await request.post(`${AUTH}/api/auth/email-code/verify`, { data: { email: s.email, code: CODE } })).json();
  expect(back.data.restored).toBe(true);
  expect(queryDb<{ d: string | null }>("SELECT deletion_scheduled_at::text AS d FROM auth.users WHERE id = $1", [s.id])[0]!.d).toBeNull();

  // schedule again (past the 60 s resend wait), let the 7 days pass, and the next lookup runs the full delete
  queryDb("UPDATE auth.email_otps SET created_at = now() - interval '5 minutes' WHERE user_id = $1", [s.id]);
  const bearer = { Authorization: `Bearer ${back.data.tokens.accessToken}` };
  expect((await request.post(`${AUTH}/api/auth/account/delete-code`, { headers: bearer })).status()).toBe(200);
  queryDb("UPDATE auth.email_otps SET otp_hash = $1 WHERE user_id = $2", [sha256(CODE), s.id]);
  expect((await request.delete(`${AUTH}/api/auth/account`, { headers: bearer, data: { confirm: "DELETE", code: CODE } })).status()).toBe(200);
  queryDb("UPDATE auth.users SET deletion_scheduled_at = now() - interval '8 days' WHERE id = $1", [s.id]);
  // day 8: signing in with the address finalises the overdue deletion first, so it becomes a brand-new account
  queryDb("INSERT INTO auth.email_login_codes (id, email, code_hash, expires_at, created_at) VALUES ($1, $2, $3, now() + interval '10 minutes', now())", [randomUUID(), s.email, sha256(CODE)]);
  const fresh = await (await request.post(`${AUTH}/api/auth/email-code/verify`, { data: { email: s.email, code: CODE } })).json();
  expect(fresh.data.user.id).not.toBe(s.id);
  // the full delete: no auth row, no sessions, no core user, nothing in any core table names the old id
  expect(queryDb("SELECT 1 FROM auth.users WHERE id = $1", [s.id])).toHaveLength(0);
  expect(queryDb("SELECT 1 FROM auth.refresh_tokens WHERE user_id = $1", [s.id])).toHaveLength(0);
  expect(queryDb("SELECT 1 FROM core.users WHERE id = $1", [s.id])).toHaveLength(0);
  expect(leftovers(s.id)).toEqual([]);
});

test("B: Feedback — sent from Settings with a screenshot, read in the admin inbox, marked resolved", async ({ page, request }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real accounts: desktop project only");
  const s = await makeStudent(request, "feedback");
  await openSignedIn(page, s, "/profile/settings");
  await page.getByTestId("settings-feedback").click();
  await expect(page.getByTestId("feedback-prompt")).toBeVisible();
  const message = `Step 2 E2E bug ${Date.now()}: the timer froze`;
  await page.getByTestId("feedback-message").fill(message);
  // a 1x1 PNG
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await page.getByTestId("feedback-screenshot").setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: png });
  await page.getByTestId("feedback-send").click();
  await expect(page.getByTestId("feedback-thanks")).toBeVisible({ timeout: 20_000 });
  const [row] = queryDb<{ id: string; route: string; has_shot: boolean }>("SELECT id, route, screenshot IS NOT NULL AS has_shot FROM core.feedback WHERE user_id = $1 AND message = $2", [s.id, message]);
  expect(row).toMatchObject({ route: "/profile/settings", has_shot: true });

  // the admin inbox (dashboard API, as the admin UI calls it)
  const adminEmail = `e2e.admin.${Date.now()}@test.prepex.io`;
  const hash = execFileSync(process.execPath, ["-e", "require('bcrypt').hash(process.argv[1], 10).then((h) => console.log(h))", "Admin!E2e123"], { cwd: BACKEND }).toString().trim();
  queryDb("INSERT INTO dashboard.admins (name, email, password_hash, is_superadmin, updated_at) VALUES ('E2E', $1, $2, false, now())", [adminEmail, hash]);
  const login = await (await request.post(`${DASH}/api/dashboard/admin/login`, { data: { email: adminEmail, password: "Admin!E2e123" } })).json();
  const auth = { Authorization: `Bearer ${login.data.tokens.accessToken}` };
  const inbox = await (await request.get(`${DASH}/api/dashboard/admin/feedback?type=bug&status=open`, { headers: auth })).json();
  expect(inbox.data.items.find((i: { id: string }) => i.id === row!.id)).toMatchObject({ hasScreenshot: true, route: "/profile/settings" });
  expect((await request.get(`${DASH}/api/dashboard/admin/feedback/${row!.id}/screenshot`, { headers: auth })).headers()["content-type"]).toMatch(/image\/webp/);
  expect((await request.patch(`${DASH}/api/dashboard/admin/feedback/${row!.id}`, { headers: auth, data: { status: "resolved" } })).status()).toBe(200);
  expect(queryDb<{ status: string }>("SELECT status FROM core.feedback WHERE id = $1", [row!.id])[0]!.status).toBe("resolved");
  queryDb("DELETE FROM dashboard.admins WHERE email = $1", [adminEmail]);
});
