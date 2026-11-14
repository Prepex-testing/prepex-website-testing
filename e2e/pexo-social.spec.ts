import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";
import { stubPlannerApi } from "./stubs/plannerStubs";

/**
 * Pexo social and growth (Part D), in a real browser against a stubbed API (no backend, no account).
 * Set PEXO_SHOTS_DIR to save screenshots.
 */

const SHOTS = process.env.PEXO_SHOTS_DIR;
const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

const SOCIAL = {
  together: [
    { id: "t1", friend: { userId: "a1", name: "Asha", username: "asha", avatarUrl: null }, status: "active", streak: 6, best: 9, freezes: 1, today: { me: false, friend: true }, line: { trigger: "together.partner_done", context: { friend: "Asha" } } },
    { id: "t2", friend: { userId: "r1", name: "Ravi", username: "ravi", avatarUrl: null }, status: "pending_in", streak: 0, best: 0, freezes: 0, today: { me: false, friend: false }, line: null },
  ],
  duels: [{ id: "d1", friend: { userId: "k1", name: "Kabir", username: "kabir", avatarUrl: null }, status: "active", me: 120, them: 80, endsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), result: null, line: { trigger: "duel.lead", context: { friend: "Kabir", xp: 40 } } }],
  invite: { code: "abc23xyz", joined: 1, rewarded: 0, recent: [] },
  batch: { rank: 3, coaching: "Allen" },
  care: false,
};

const pexo = (over: Record<string, unknown> = {}) => ({
  enabled: true,
  cohort: "existing",
  libraryVersion: 1,
  language: "en",
  bubbles: "normal",
  notifications: true,
  accessories: [],
  shown: {},
  firstVisits: ["planner", "goals", "logs", "analytics"],
  marks: { tour: today },
  today,
  daysSinceSignup: 30,
  home: { key: "morning", triggers: ["home.morning"], context: { n: 6, subject: "Physics", time: "3:45 pm", hours: 3.5, done: 1, left: 5 }, exclude: [], actions: [] },
  quests: { done: ["focus", "dayclose"], justDone: [], recommend: "revision", allDone: false },
  nudge: null,
  care: { active: false, reason: null, distress: false },
  ...over,
});

async function open(page: Page, state: Record<string, unknown>, theme: "light" | "dark" = "light", route = "/home", ask?: unknown) {
  await page.emulateMedia({ colorScheme: theme });
  await stubPlannerApi(page, theme);
  await page.route(/localhost:4\d{3}\/api\/(xp\/summary|pexo|backlog-items|class-coverage|day-close|sunday-review|profile\/overview|social|rewards|productivity|streak)/, (route: Route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith("/xp/summary")) return route.fulfill(ok({ level: 3, title: "Aspirant", totalXp: 420, currentThreshold: 300, nextThreshold: 600, progressPct: 40, todayXp: 20, monthXp: 200, todayMinutes: 50, todayStudyMinutes: 95, rankGps: null, pexo: state }));
    if (p.endsWith("/pexo/ask")) return route.fulfill(ok(ask ?? { trigger: "ask.next.task", context: { task: "Practice: Mole Concept" }, action: { kind: "focus", label: "Start", taskId: "t1", subjectId: 2, taskType: "practice", minutes: 60 } }));
    if (p.endsWith("/pexo/teaser")) return route.fulfill(ok(null));
    if (p.endsWith("/pexo/social")) return route.fulfill(ok(SOCIAL));
    if (p.includes("/pexo/invite/")) return route.fulfill(ok({ valid: true, name: "Asha" }));
    if (p.endsWith("/pexo/finds")) return route.fulfill(ok([{ id: 3, type: "trick", subject: "Physics", chapter: "Laws of Motion", chapterId: "c1", text: "Draw the free-body diagram first.", saved: true }]));
    if (p.includes("/backlog-items")) return route.fulfill(ok({ totals: { open: 3, scheduled: 1, overdue: 0, total: 4 }, items: [], bySubject: [] }));
    if (p.includes("/class-coverage")) return route.fulfill(ok([]));
    if (p.endsWith("/day-close")) return route.fulfill(ok({ date: today, status: "not_yet", triggerMinute: 1290, triggerReason: "fallback", summary: { minutes: 95, tasksDone: 1, tasksTotal: 6, questions: 0, revisions: 0 }, unfinished: [], coverage: [] }));
    if (p.endsWith("/sunday-review")) return route.fulfill(ok({ status: "not_yet" }));
    if (p.includes("/social/studying-now")) return route.fulfill(ok([]));
    if (p.endsWith("/leaderboard/rules")) return route.fulfill(ok({ earn: [{ label: "Focus, per minute", value: "1 XP" }], resets: { today: "midnight", month: "1st", improved: "Monday" }, caps: [] }));
    if (p.endsWith("/leaderboard/hall")) return route.fulfill(ok({ months: [], month: null, boards: [] }));
    if (p.endsWith("/social/settings")) return route.fulfill(ok({ username: "qa", displayName: "QA", leaderboardHidden: false, showAccuracy: true, showMockScores: true }));
    if (p.includes("/social")) return route.fulfill(ok({ rows: [], me: { rank: null } }));
    if (p.endsWith("/rewards")) return route.fulfill(ok({ lifetime: { questions: 0, hours: 0, chaptersCompleted: 0 }, badges: [], unseen: [], records: [], brokenRecords: [] }));
    if (p.includes("/streak")) return route.fulfill(ok({ currentStreak: 4, longestStreak: 9 }));
    if (p.includes("/productivity")) return route.fulfill(ok({ rows: [], me: { rank: null } }));
    if (p.endsWith("/profile/overview")) return route.fulfill(ok({ daysUntilExam: 142, exam: { name: "JEE Main" } }));
    return route.fulfill(ok(null));
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(route);
  return errors;
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
}

for (const theme of ["light", "dark"] as const) {
  test(`Home: Climb Together, the duel, the batch line (${theme})`, async ({ page }, info) => {
    const errors = await open(page, pexo(), theme);
    const together = page.getByTestId("climb-together");
    await expect(together).toBeVisible();
    await expect(page.getByTestId("together-row")).toHaveCount(2);
    await expect(page.getByTestId("duel-row")).toContainText("120 : 80 XP");
    await expect(page.getByTestId("batch-rank")).toContainText("#3 in your Allen batch");
    await together.scrollIntoViewIfNeeded();
    await shot(page, `climb-together-${theme}-${info.project.name}`);
    await page.getByTestId("invite-open").click();
    await expect(page.getByTestId("invite-message")).toContainText("/join/abc23xyz");
    await shot(page, `invite-sheet-${theme}-${info.project.name}`);
    expect(errors).toEqual([]);
  });
}

test("the invite link page, before signing in", async ({ page }, info) => {
  await page.route(/localhost:4\d{3}\/api\/pexo\/invite\//, (r: Route) => r.fulfill(ok({ valid: true, name: "Asha" })));
  await page.goto("/join/abc23xyz?utm_source=whatsapp");
  await expect(page.getByTestId("join-title")).toHaveText("Asha invited you to Prepex");
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("prepex-invite") ?? "null")?.utm?.source)).toBe("whatsapp");
  await shot(page, `join-page-${info.project.name}`);
});

test("care mode: no duel on Home", async ({ page }) => {
  await open(page, pexo({ care: { active: true, reason: "low_mood", distress: false } }));
  await page.route(/localhost:4\d{3}\/api\/pexo\/social/, (r: Route) => r.fulfill(ok({ ...SOCIAL, care: true })));
  await page.reload();
  await expect(page.getByTestId("climb-together")).toBeVisible();
  await expect(page.getByTestId("duels")).toHaveCount(0);
});
