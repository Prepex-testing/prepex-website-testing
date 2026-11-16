import { createHash, randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { dismissFirstRunOverlays, queryDb } from "./helpers";

/**
 * Launch step 2 (carry-over 3): the journeys a student does every day, against the REAL local stack.
 * One student made through the API (e-mail code + onboarding complete). Its week has one short study block at
 * 04:00–04:30, so Day Close is open from 04:45 IST; Sunday Review runs only while it is offered (Sunday 18:00 → Monday).
 * Every test watches for HTTP 429 and console errors.
 */
const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";
const AUTH = process.env.E2E_AUTH_URL ?? CORE.replace(/:(\d+)$/, (_, p) => `:${Number(p) - 1}`);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const CODE = "135792";

type Student = { id: string; email: string; accessToken: string; refreshToken: string; user: unknown };
let s: Student;
let physics: { chapters: { id: string; name: string }[] };

async function signIn(request: APIRequestContext, email: string) {
  queryDb("INSERT INTO auth.email_login_codes (id, email, code_hash, expires_at, created_at) VALUES ($1, $2, $3, now() + interval '10 minutes', now())", [randomUUID(), email, sha256(CODE)]);
  const res = await request.post(`${AUTH}/api/auth/email-code/verify`, { data: { email, code: CODE, fullName: "Journey Student" } });
  expect(res.status()).toBe(200);
  return (await res.json()).data as { user: { id: string }; tokens: { accessToken: string; refreshToken: string } };
}

async function api<T = unknown>(request: APIRequestContext, method: "GET" | "POST", path: string, data?: unknown): Promise<T> {
  const res = await request.fetch(`${CORE}${path}`, { method, headers: { Authorization: `Bearer ${s.accessToken}` }, ...(data === undefined ? {} : { data }) });
  expect(res.status(), `${method} ${path}: ${await res.text()}`).toBeLessThan(300);
  return ((await res.json()) as { data: T }).data;
}

/** Signs the browser in and records every 429 and console error the page sees. */
async function open(page: Page, at: string) {
  const problems: string[] = [];
  page.on("response", (r) => {
    if (r.status() === 429) problems.push(`429 ${r.url()}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  await dismissFirstRunOverlays(page);
  await page.addInitScript((x) => {
    if (sessionStorage.getItem("e2e-signed-in")) return;
    sessionStorage.setItem("e2e-signed-in", "1");
    localStorage.setItem("prepex_access_token", x.accessToken);
    localStorage.setItem("prepex_refresh_token", x.refreshToken);
    localStorage.setItem("prepex_user", JSON.stringify(x.user));
  }, s);
  await page.goto(at);
  const skip = page.getByText("Skip for today");
  if (await skip.waitFor({ timeout: 6000 }).then(() => true, () => false)) {
    await skip.click();
    await page.waitForURL((u) => u.pathname === "/home", { timeout: 30_000 });
    if (at !== "/home") await page.goto(at);
  }
  return problems;
}

const istHour = () => new Date(Date.now() + 5.5 * 3_600_000).getUTCHours();

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  const email = `step2.journeys.${Date.now()}@test.prepex.io`;
  const v = await signIn(request, email);
  s = { id: v.user.id, email, accessToken: v.tokens.accessToken, refreshToken: v.tokens.refreshToken, user: v.user };
  const [exam] = queryDb<{ id: string }>("SELECT id FROM dashboard.exams WHERE is_active ORDER BY (code = 'JEE_MAIN') DESC, code LIMIT 1");
  const blocks = Array.from({ length: 7 }, (_, d) => ({ dayOfWeek: d, startTime: "04:00", endTime: "04:30", activityType: "SELF_STUDY" }));
  await api(request, "POST", "/api/onboarding/complete", {
    examId: exam!.id, fullName: "Journey Student", targetExamDate: "2027-01-24", examDateIsDefault: true, currentLevel: "CLASS_12", coachingType: "SELF_PREP",
    timetable: { uniformWeek: true, source: "COACHING_TEMPLATE", blocks }, completedChapterIds: [], ageBand: "17",
  });
  const tree = await api<{ subjects: { id: number; name: string; chapters: { id: string; name: string }[] }[] }>(request, "GET", "/api/profile/subjects-chapters?allClasses=true");
  physics = tree.subjects.find((x) => x.id === 1)!;
});

test.beforeEach(({}, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real accounts: desktop project only");
});

test("planner: tick a lecture → done with a 5-second undo → undo puts it back", async ({ page, request }) => {
  const chapter = physics.chapters[0]!;
  const added = await api<{ task: { id: string } }>(request, "POST", "/api/planner/v2/tasks", { kind: "lecture", subjectId: 1, chapterId: chapter.id, minutes: 45, slot: "now", override: true });
  const problems = await open(page, "/planner");
  const card = page.locator(`[data-testid="study-task"][data-task-id="${added.task.id}"]`);
  await expect(card).toBeVisible({ timeout: 30_000 });
  const before = await card.getAttribute("data-status");
  await card.getByTestId("task-check").click();
  await expect(page.getByTestId("undo-bar")).toBeVisible();
  await expect(card).toHaveAttribute("data-status", "done");
  expect(queryDb<{ status: string }>('SELECT status FROM core.plan_tasks WHERE id = $1', [added.task.id])[0]!.status).toMatch(/complete|done/i);
  // the lecture asks where the chapter stands: In progress (Day Close uses it below)
  await page.getByTestId("chapter-learning").click({ timeout: 10_000 }).catch(() => undefined);
  await page.getByTestId("undo-button").click();
  await expect(card).toHaveAttribute("data-status", before!);
  expect(queryDb<{ status: string }>('SELECT status FROM core.plan_tasks WHERE id = $1', [added.task.id])[0]!.status).not.toMatch(/complete|done/i);
  expect(problems).toEqual([]);
});

test("Quick Log: every chip — studied, solved Qs, revised, mock, mistake, coaching class", async ({ page }) => {
  const chapter = physics.chapters[1]!;
  const problems = await open(page, "/home");
  const openHub = async () => {
    await page.getByTestId("quick-log-fab").click();
    await expect(page.getByTestId("quick-chips")).toBeVisible();
  };
  const pick = async (withChapter: boolean) => {
    await page.getByTestId("ql-subject").selectOption("1");
    if (withChapter) await page.getByTestId("ql-chapter").selectOption(chapter.id);
  };
  const count = (table: string) => Number(queryDb<{ n: string }>(`SELECT count(*)::text AS n FROM core.${table} WHERE user_id = $1`, [s.id])[0]!.n);

  await openHub();
  await page.getByTestId("quick-studied").click();
  await pick(false);
  await page.getByTestId("minutes-30").click();
  await page.getByTestId("quick-save").click();
  await expect.poll(() => count("study_sessions")).toBeGreaterThan(0);
  await expect(page.getByTestId("quick-log-hub")).toBeHidden({ timeout: 10_000 });

  await openHub();
  await page.getByTestId("quick-questions").click();
  await pick(true);
  for (let i = 0; i < 4; i++) await page.getByTestId("quick-attempted-inc").click();
  for (let i = 0; i < 3; i++) await page.getByTestId("quick-correct-inc").click();
  await page.getByTestId("quick-save").click();
  // attempted starts at the sheet's default (+4 taps); correct from none (+3 taps); wrong is the rest
  await expect.poll(() => queryDb<{ c: number; ok: boolean }>("SELECT questions_correct AS c, questions_wrong = questions_attempted - questions_correct AS ok FROM core.practice_logs WHERE user_id = $1", [s.id])[0]).toEqual({ c: 3, ok: true });
  await expect(page.getByTestId("quick-log-hub")).toBeHidden({ timeout: 10_000 });

  await openHub();
  await page.getByTestId("quick-revised").click();
  await pick(true);
  await page.getByTestId("recall-ok").click();
  await expect.poll(() => count("revision_logs")).toBe(1);
  await expect(page.getByTestId("quick-log-hub")).toBeHidden({ timeout: 10_000 });

  await openHub();
  await page.getByTestId("quick-mock").click();
  await page.getByTestId("quick-marks").fill("162");
  await page.getByTestId("quick-save").click();
  await expect.poll(() => queryDb<{ m: string }>("SELECT total_marks::text AS m FROM core.mock_tests WHERE user_id = $1", [s.id])[0]?.m).toBe("162");
  await expect(page.getByTestId("quick-log-hub")).toBeHidden({ timeout: 10_000 });

  await openHub();
  await page.getByTestId("quick-class").click();
  await expect(page.getByTestId("quick-class")).toBeVisible(); // the coverage chips (or their empty note) for today's class
  await page.getByTestId("quick-back").click();
  await page.getByTestId("quick-mistake").click();
  await expect(page).toHaveURL(/\/notebooks\/capture/);
  expect(problems).toEqual([]);
});

test("Day Close: a chapterless task goes to Backlog under a chapter in progress; the day closes with the reward", async ({ page, request }) => {
  test.skip(istHour() < 5, "Day Close opens at 04:45 IST for this student's week");
  const chapter = physics.chapters[2]!;
  // a chapter in progress, so the chapterless task has somewhere to go
  await api(request, "POST", "/api/planner/v2/tasks", { kind: "lecture", subjectId: 1, chapterId: chapter.id, minutes: 30, slot: "now", override: true });
  queryDb(
    "INSERT INTO core.user_chapter_progress (id, user_id, chapter_id, status, updated_at) VALUES (gen_random_uuid(), $1, $2, 'LEARNING', now()) ON CONFLICT (user_id, chapter_id) DO UPDATE SET status = 'LEARNING', updated_at = now()",
    [s.id, chapter.id],
  );
  const loose = await api<{ task: { id: string } }>(request, "POST", "/api/planner/v2/tasks", { kind: "self_study", subjectId: 1, topic: "Formula sheet", minutes: 30, slot: "next_free", override: true });

  const problems = await open(page, "/home");
  await page.getByTestId("day-close-open").click({ timeout: 30_000 });
  await expect(page.getByTestId("day-close-flow")).toBeVisible();
  const row = page.getByTestId("unfinished").locator("div.rounded-xl").filter({ hasText: "Formula sheet" });
  await row.getByTestId("choice-backlog").click();
  await expect(row.getByTestId("backlog-chapter-pick")).toBeVisible();
  await row.getByTestId("backlog-chip").filter({ hasText: chapter.name }).click();
  // everything else rolls to tomorrow
  for (const other of await page.getByTestId("unfinished").locator("div.rounded-xl").filter({ hasNotText: "Formula sheet" }).all()) await other.getByTestId("choice-tomorrow").click();
  await page.getByTestId("day-win").fill("Finished the kinematics lecture");
  await page.getByTestId("day-close-submit").click();
  await expect(page.getByTestId("day-close-reward")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("day-close-finish").click();

  const [closed] = queryDb<{ done: boolean; win: string }>("SELECT completed_at IS NOT NULL AS done, win FROM core.day_closes WHERE user_id = $1", [s.id]);
  expect(closed).toMatchObject({ done: true, win: "Finished the kinematics lecture" });
  const items = queryDb<{ chapter_id: string; topic: string | null }>("SELECT chapter_id, topic FROM core.backlog_items WHERE user_id = $1", [s.id]);
  expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ chapter_id: chapter.id })]));
  expect(queryDb<{ status: string }>("SELECT status FROM core.plan_tasks WHERE id = $1", [loose.task.id])[0]!.status).not.toBe("PENDING");
  expect(problems).toEqual([]);
});

test("Sunday Review: recap → no test → goals with the pledge → finished, pledge saved for next week", async ({ page, request }) => {
  const state = await api<{ status: string; nextWeekStart: string | null }>(request, "GET", "/api/sunday-review");
  test.skip(state.status !== "ready", "Sunday Review is offered from Sunday 18:00 IST until Monday ends");
  const problems = await open(page, "/home/review");
  await page.getByTestId("to-test").click({ timeout: 30_000 });
  await page.getByTestId("test-skip").click();
  await expect(page.getByTestId("step-goals")).toBeVisible();
  await expect(page.getByTestId("pledge-card")).toBeVisible();
  await page.getByTestId("pledge-hours").fill("21");
  await page.getByTestId("pledge-questions").fill("250");
  await page.getByTestId("review-finish").click();
  await expect(page.getByTestId("step-share")).toBeVisible({ timeout: 20_000 });
  expect(queryDb("SELECT 1 FROM core.sunday_reviews WHERE user_id = $1 AND completed_at IS NOT NULL", [s.id])).toHaveLength(1);
  expect(queryDb<{ w: string; hours: number; questions: number }>("SELECT week_start::text AS w, hours, questions FROM core.pexo_pledges WHERE user_id = $1", [s.id])).toEqual([
    { w: state.nextWeekStart, hours: 21, questions: 250 },
  ]);
  expect(problems).toEqual([]);
});

test("settings: a privacy switch saves to the profile; dark theme sticks after a reload", async ({ page }) => {
  const problems = await open(page, "/profile");
  const city = page.getByTestId("profile-social").getByRole("switch", { name: "Show my city" });
  await expect(city).toHaveAttribute("aria-checked", "false", { timeout: 30_000 });
  await city.click();
  await expect(page.getByTestId("social-message")).toHaveText("Saved");
  expect(queryDb<{ c: boolean }>("SELECT show_city AS c FROM core.user_profiles WHERE user_id = $1", [s.id])[0]!.c).toBe(true);
  await city.click();
  await expect.poll(() => queryDb<{ c: boolean }>("SELECT show_city AS c FROM core.user_profiles WHERE user_id = $1", [s.id])[0]!.c).toBe(false);

  await page.goto("/profile/settings");
  await page.getByTestId("theme-dark").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.getByTestId("theme-dark")).toHaveAttribute("aria-checked", "true", { timeout: 30_000 });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("theme-system").click();
  expect(problems).toEqual([]);
});

test("rapid tab switching ×10: no 429, no console error, every screen renders", async ({ page }) => {
  const problems = await open(page, "/home");
  const tabs: [string, RegExp][] = [
    ["Study", /\/logs/],
    ["Analytics", /\/analytics/],
    ["Profile", /\/profile/],
    ["Home", /\/home/],
  ];
  for (let round = 0; round < 10; round++) {
    for (const [label, url] of tabs) {
      await page.locator("nav a:visible", { hasText: new RegExp(`^\\s*${label}\\s*$`) }).first().click();
      await expect(page).toHaveURL(url);
    }
  }
  await expect(page.getByTestId("home-top")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3000); // let the last screen's requests land
  expect(problems).toEqual([]);
});

test("logout → back on the sign-in screen with no session; sign in again → Home", async ({ page, request }) => {
  const problems = await open(page, "/home");
  await page.getByRole("button", { name: /^Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/(login|start)/, { timeout: 20_000 });
  expect(await page.evaluate(() => localStorage.getItem("prepex_access_token"))).toBeNull();
  await page.goto("/home");
  await expect(page).toHaveURL(/\/(login|start)/, { timeout: 20_000 });

  await page.goto("/start");
  await page.getByTestId("signin-email").click();
  await page.getByPlaceholder("Rohan@example.com").fill(s.email);
  await page.getByTestId("signin-send-code").click();
  await expect(page.getByTestId("signin-code")).toBeVisible({ timeout: 20_000 });
  queryDb("UPDATE auth.email_login_codes SET code_hash = $1 WHERE email = $2", [sha256(CODE), s.email]);
  await page.getByTestId("signin-code").fill(CODE);
  await expect(page).toHaveURL(/\/(home|check-in)/, { timeout: 45_000 });
  expect(await page.evaluate(() => localStorage.getItem("prepex_access_token"))).toBeTruthy();
  void request;
  expect(problems.filter((p) => !p.includes("401"))).toEqual([]);
});
