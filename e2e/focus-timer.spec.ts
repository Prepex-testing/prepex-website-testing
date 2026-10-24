import { expect, test, type Page } from "@playwright/test";
import { expectTapTargets, generateTodayPlan, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

/**
 * The one focus timer, end to end against the real stack: every entry point opens it pre-filled, a finished session is
 * saved in one go (the right log, the origin marked, chapter progress, streak), and the legacy URLs redirect.
 */
test.describe.configure({ mode: "serial" });

const core = process.env.E2E_CORE_URL ?? "http://localhost:4002";
/** The server credits whole minutes (rounded), so a session needs just over 30 seconds of focus to count as one. */
const ONE_MINUTE_MS = 34_000;

type Json = Record<string, unknown>;

async function api<T = Json>(page: Page, method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ base, method, path, body }) => {
      const token = localStorage.getItem("prepex_access_token");
      const res = await fetch(`${base}${path}`, {
        method,
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    },
    { base: core, method, path, body },
  ) as Promise<{ status: number; body: T }>;
}

type PlanTask = { id: string; taskType: string; status: string; title: string; chapterId: string | null; linkedFocusSessionId?: string | null };

let kinematics = "";
let thermo = "";
let planTask: PlanTask;
/** The login from the setup test (each Playwright test gets a fresh browser, so later tests restore it). */
let saved: { origin: string; entries: [string, string][] } | null = null;

test.beforeEach(async ({ context }) => {
  if (!saved) return;
  const { origin, entries } = saved;
  await context.addInitScript(
    ({ origin, entries }) => {
      if (location.origin === origin) for (const [k, v] of entries) if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
    },
    { origin, entries },
  );
});

async function startRunStop(page: Page, opts: { ms?: number } = {}) {
  await page.getByTestId("start-focus").click();
  await expect(page.getByTestId("focus-running")).toBeVisible();
  await page.waitForTimeout(opts.ms ?? ONE_MINUTE_MS);
  await page.getByTestId("stop-focus").click();
  await expect(page.getByTestId("focus-summary")).toBeVisible();
}

test("setup: log in, onboard, build today's plan", async ({ page }) => {
  test.setTimeout(240_000);
  resetStudent();
  await onboardAndEnterApp(page);
  await generateTodayPlan(page);

  const chapters = await api<{ data: { subjects: { name: string; chapters: { id: string; name: string }[] }[] } }>(page, "GET", "/api/profile/subjects-chapters?allClasses=true");
  const all = chapters.body.data.subjects.flatMap((s) => s.chapters);
  kinematics = all.find((c) => c.name === "Kinematics")!.id;
  thermo = all.find((c) => c.name === "Thermodynamics")!.id;

  // A brand-new student's plan can be empty (no timetable, nothing studied), so add the task the demo starts from:
  // a 60-minute Physics lecture on Kinematics, exactly what the "Add task" button on Home creates.
  const added = await api(page, "POST", "/api/planner/addtask", { title: "Kinematics lecture", taskType: "NEW_LEARNING", estimatedMinutes: 60, chapterId: kinematics, subjectId: 1 });
  expect(added.status, JSON.stringify(added.body)).toBeLessThan(300);

  const today = await api<{ data: { plan: { tasks: PlanTask[] } } }>(page, "GET", "/api/planner/today");
  const learning = today.body.data.plan.tasks.find((t) => t.taskType === "NEW_LEARNING");
  expect(learning, "today's plan should hold the new-learning task").toBeTruthy();
  planTask = learning!;

  const state = await page.context().storageState();
  const o = state.origins.find((x) => x.origin.includes("5000"));
  saved = { origin: o!.origin, entries: o!.localStorage.map((e) => [e.name, e.value] as [string, string]) };
  expect(saved.entries.some(([k]) => k === "prepex_access_token")).toBe(true);
});

test("legacy timer URLs redirect with a 301 and keep the task id", async ({ page }) => {
  const check = async (from: string, to: RegExp) => {
    const res = await page.request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(res.headers()["location"], from).toMatch(to);
  };
  // (Next keeps the old query string on the end of the redirect, which the timer ignores.)
  await check(`/home/session?taskId=${planTask.id}`, new RegExp(`^/focus/start\\?.*origin=planner.*id=${planTask.id}`));
  await check(`/revision-session?taskId=${planTask.id}`, new RegExp(`^/focus/start\\?.*origin=revision_tab.*id=${planTask.id}`));
  await check("/home/session", /\/focus\/start\?origin=standalone/);
  await check("/home/session/welcome-back", /\/focus\/start\?origin=standalone/);
  await check("/revision-session/complete", /\/focus\/start\?origin=standalone/);
  await check("/focus/legacy", /\/focus\/start\?origin=standalone/);
  await check("/timer/old", /\/focus\/start\?origin=standalone/);
  await check("/focus", /\/focus\/start\?origin=standalone/);
});

test("planner: Start opens the timer pre-filled → run → auto-log, task done, streak", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-focus-${name}.png` });

  await page.goto("/home");
  const start = page.locator(`a[href*="/focus/start?origin=planner&id=${planTask.id}"]`).first();
  await expect(start).toBeVisible({ timeout: 60_000 });
  await start.click();

  // The timer opens full screen with the task already in it.
  await expect(page.getByTestId("focus-page")).toBeVisible();
  await expect(page.getByTestId("origin-chip")).toHaveText("From today's plan");
  await expect(page.getByTestId("focus-subject")).not.toHaveValue("");
  await expect(page.getByTestId("focus-chapter")).not.toHaveValue("");
  await expect(page.getByLabel(/topic/i)).not.toHaveValue("");
  await expect(page.getByTestId("start-focus")).toBeEnabled();
  const box = await page.getByTestId("start-focus").boundingBox();
  expect(Math.min(box!.width, box!.height), "Start is a 72px+ circle").toBeGreaterThanOrEqual(72);
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid^="mode-"], [data-testid^="type-"], [data-testid^="preset-"], [data-testid="start-focus"]');
  }
  await shot("1-setup-pomodoro");

  // The same screen in the other two modes.
  await page.getByTestId("mode-stopwatch").click();
  await shot("2-setup-stopwatch");
  await page.getByTestId("mode-countdown").click();
  await shot("3-setup-countdown");
  await page.getByTestId("mode-pomodoro").click();

  await page.getByTestId("start-focus").click();
  await expect(page.getByTestId("focus-running")).toBeVisible();
  await expect(page.getByTestId("focus-ring")).toBeVisible();
  await expect(page.getByTestId("running-meta")).toContainText("Pomodoro");
  await shot("4-running-pomodoro");
  if (mobile) await noHorizontalScroll(page);

  await page.waitForTimeout(ONE_MINUTE_MS);
  await page.getByTestId("stop-focus").click();
  await expect(page.getByTestId("focus-summary")).toBeVisible();
  await page.getByTestId("mood-4").click();
  await page.getByTestId("win-yes").click();
  await shot("5-end-session");
  await page.getByTestId("save-session").click();

  await expect(page.getByTestId("focus-done")).toBeVisible();
  await expect(page.getByTestId("focus-done-text")).toContainText("1m added to your study log");
  await expect(page.getByTestId("logged-list")).toContainText("Marked your planner task as done.");
  await expect(page.getByTestId("focus-done").getByTestId("streak-chip")).toBeVisible();
  await shot("6-done");

  // The task is done, linked to the session, and the time is in the study log and chapter progress.
  const today = await api<{ data: { plan: { tasks: PlanTask[] } } }>(page, "GET", "/api/planner/today");
  const after = today.body.data.plan.tasks.find((t) => t.id === planTask.id)!;
  expect(after.status).toBe("COMPLETED");
  expect(after.linkedFocusSessionId).toBeTruthy();
  const log = await api<{ data: { items: { source: string; durationMinutes: number }[] } }>(page, "GET", "/api/study-sessions?limit=5");
  expect(log.body.data.items[0]).toMatchObject({ source: "focus_mode", durationMinutes: 1 });
  const stats = await api<{ data: { todayMinutes: number; streak: { todayMinutes: number } } }>(page, "GET", "/api/focus-sessions/stats");
  expect(stats.body.data.todayMinutes).toBe(1);
});

test("the Home Focus tile and the nav open a standalone timer; Stopwatch, pause, resume", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  await page.goto("/home");
  await page.getByRole("button", { name: /^Focus/ }).first().click();
  await expect(page).toHaveURL(/\/focus\/start\?origin=home_quick_tile/);
  await expect(page.getByTestId("origin-chip")).toHaveText("From home");
  await expect(page.getByTestId("focus-subject")).toHaveValue("");
  await expect(page.getByTestId("start-focus")).toBeDisabled();

  const nav = mobile ? page.getByRole("navigation", { name: "Primary" }) : page.locator("aside nav");
  await page.goto("/home");
  await nav.getByRole("link", { name: "Focus" }).first().click();
  await expect(page).toHaveURL(/\/focus\/start\?origin=standalone/);
  await expect(page.getByTestId("standalone-hint")).toContainText("from scratch");
  await expect(page.getByTestId("origin-chip")).toHaveCount(0);

  await page.getByTestId("focus-subject").selectOption({ label: "Physics" });
  await page.getByTestId("focus-chapter").selectOption({ label: "Kinematics" });
  await page.getByTestId("mode-stopwatch").click();
  await page.getByTestId("start-focus").click();
  await expect(page.getByTestId("focus-running")).toBeVisible();
  await expect(page.getByTestId("running-meta")).toContainText("Stopwatch");

  // A reload mid-session picks the same session back up; the clock counts up.
  await page.reload();
  await expect(page.getByTestId("focus-running")).toBeVisible();
  await page.getByTestId("pause-focus").click();
  await expect(page.getByTestId("resume-focus")).toBeVisible();
  const frozen = await page.getByTestId("focus-clock").textContent();
  await page.waitForTimeout(2200);
  expect(await page.getByTestId("focus-clock").textContent()).toBe(frozen);
  await page.getByTestId("resume-focus").click();
  await page.waitForTimeout(ONE_MINUTE_MS);

  await page.getByTestId("stop-focus").click();
  await page.getByTestId("save-session").click();
  await expect(page.getByTestId("focus-done")).toBeVisible();
  // Standalone: the session and its study row only, nothing upstream to mark done.
  await expect(page.getByTestId("focus-done-text")).toContainText("added to your study log");
  await expect(page.getByTestId("logged-list")).toHaveCount(0);
});

test("practice (own content): the 15-second sheet logs the practice and feeds the notebook", async ({ page }, info) => {
  test.setTimeout(240_000);
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-focus-${name}.png` });
  await page.goto(`/focus/start?origin=practice_tab&chapter=${kinematics}`);
  await expect(page.getByTestId("type-practice")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("focus-chapter")).toHaveValue(kinematics);
  await startRunStop(page);

  await page.getByTestId("sheet-attempted").fill("10");
  await page.getByTestId("sheet-correct").fill("6");
  await page.getByTestId("sheet-wrong").fill("3");
  await page.getByTestId("sheet-source").selectOption("hcv");
  await page.getByTestId("sheet-wrong-notes").fill("Q3 sign error\nQ7 used the wrong formula");
  await page.getByTestId("win-yes").click();
  await shot("7-end-practice-sheet");
  await page.getByTestId("save-session").click();

  await expect(page.getByTestId("focus-done")).toBeVisible();
  await expect(page.getByTestId("logged-list")).toContainText("Saved your practice log.");
  await expect(page.getByTestId("logged-list")).toContainText("2 questions were added to your mistake notebook.");

  const practice = await api<{ data: { items: { chapterId: string; questionsAttempted: number; questionsCorrect: number; questionsWrong: number; questionsSkipped: number; source: string }[] } }>(page, "GET", "/api/practice?limit=5");
  expect(practice.body.data.items[0]).toMatchObject({ chapterId: kinematics, questionsAttempted: 10, questionsCorrect: 6, questionsWrong: 3, questionsSkipped: 1, source: "hcv" });
  const mistakes = await api<{ data: { items: { chapterId: string; questionText: string; tags: string[] }[] } }>(page, "GET", "/api/mistakes?limit=10");
  expect(mistakes.body.data.items.map((m) => m.questionText).sort()).toEqual(["Q3 sign error", "Q7 used the wrong formula"]);
  expect(mistakes.body.data.items.every((m) => m.chapterId === kinematics && m.tags.includes("focus-session"))).toBe(true);
});

test("revision: the confidence rating reschedules the chapter (SM-2)", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(`/focus/start?origin=revision_tab&chapter=${thermo}`);
  await expect(page.getByTestId("type-revision")).toHaveAttribute("aria-checked", "true");
  await startRunStop(page);
  await expect(page.getByTestId("revision-confidence")).toBeVisible();
  await page.getByTestId("conf-4").click();
  await page.getByTestId("win-yes").click();
  await page.getByTestId("save-session").click();
  await expect(page.getByTestId("focus-done")).toBeVisible();
  await expect(page.getByTestId("logged-list")).toContainText("Your next revision of this chapter is in 1 day.");

  const revisions = await api<{ data: { items: { chapterId: string }[] } }>(page, "GET", "/api/revisions?limit=5");
  expect(revisions.body.data.items[0]?.chapterId).toBe(thermo);
});

test("backlog: finishing the item clears it", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/home");
  const created = await api<{ data: { id: string } }>(page, "POST", "/api/backlog-items", { subjectId: 1, chapterId: kinematics, topic: "Vectors", estimatedMinutes: 1, priority: 2 });
  expect(created.status).toBeLessThan(300);
  const id = created.body.data.id;

  await page.goto(`/logs/backlog`);
  await expect(page.getByTestId(`start-${id}`)).toBeVisible();
  await page.getByTestId(`start-${id}`).click();
  await expect(page).toHaveURL(new RegExp(`origin=backlog_tab&id=${id}`));
  await expect(page.getByLabel(/topic/i)).toHaveValue("Vectors");
  await startRunStop(page);
  await page.getByTestId("win-yes").click();
  await page.getByTestId("save-session").click();
  await expect(page.getByTestId("logged-list")).toContainText("Cleared that backlog item.");

  const item = await api<{ data: { status: string; progressPercent: number } }>(page, "GET", `/api/backlog-items/${id}`);
  expect(item.body.data).toMatchObject({ status: "cleared", progressPercent: 100 });
});

test("the timer in dark mode on a phone", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("prepex-theme", "dark"));
  await page.goto("/focus/start?origin=standalone");
  await expect(page.getByTestId("focus-page")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: `e2e/.shots/${info.project.name}-focus-8-setup-dark.png` });
  if (info.project.name.startsWith("mobile")) await noHorizontalScroll(page);
});
