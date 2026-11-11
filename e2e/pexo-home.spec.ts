import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";
import { stubPlannerApi } from "./stubs/plannerStubs";

/**
 * Pexo on Home and in the guidance flows, in a real browser against a stubbed API (no backend, no account).
 * Set PEXO_SHOTS_DIR to save screenshots.
 */

const SHOTS = process.env.PEXO_SHOTS_DIR;
const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

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
  await page.route(/localhost:400[123]\/api\/(xp\/summary|pexo|backlog-items|class-coverage|day-close|sunday-review|profile\/overview|social|rewards|productivity|streak)/, (route: Route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith("/xp/summary")) return route.fulfill(ok({ level: 3, title: "Aspirant", totalXp: 420, currentThreshold: 300, nextThreshold: 600, progressPct: 40, todayXp: 20, monthXp: 200, todayMinutes: 50, todayStudyMinutes: 95, rankGps: null, pexo: state }));
    if (p.endsWith("/pexo/ask")) return route.fulfill(ok(ask ?? { trigger: "ask.next.task", context: { task: "Practice: Mole Concept" }, action: { kind: "focus", label: "Start", taskId: "t1", subjectId: 2, taskType: "practice", minutes: 60 } }));
    if (p.endsWith("/pexo/teaser")) return route.fulfill(ok(null));
    if (p.includes("/backlog-items")) return route.fulfill(ok({ totals: { open: 3, scheduled: 1, overdue: 0, total: 4 }, items: [], bySubject: [] }));
    if (p.includes("/class-coverage")) return route.fulfill(ok([]));
    if (p.endsWith("/day-close")) return route.fulfill(ok({ date: today, status: "not_yet", triggerMinute: 1290, triggerReason: "fallback", summary: { minutes: 95, tasksDone: 1, tasksTotal: 6, questions: 0, revisions: 0 }, unfinished: [], coverage: [] }));
    if (p.endsWith("/sunday-review")) return route.fulfill(ok({ status: "not_yet" }));
    if (p.includes("/social/studying-now")) return route.fulfill(ok([]));
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
  test(`Home: Pexo's morning line, the Prepex map, Ask (${theme})`, async ({ page }, info) => {
    const errors = await open(page, pexo(), theme);
    const bubble = page.getByTestId("home-pexo-bubble");
    await expect(bubble).toBeVisible();
    await expect(bubble).toHaveAttribute("data-line", /^home\.morning#/);
    await expect(page.getByTestId("prepex-map")).toBeVisible();
    await expect(page.getByTestId("prepex-map-recommend")).toContainText("Today's quest: tick a revision");
    await shot(page, `home-morning-${theme}-${info.project.name}`);
    await page.getByTestId("home-pexo-ask").first().click();
    await expect(page.getByTestId("ask-answer")).toContainText("Next up: Practice: Mole Concept. Shall I start the timer?");
    await shot(page, `ask-${theme}-${info.project.name}`);
    expect(errors).toEqual([]);
  });
}

test("Home bubble at each time window and in care mode", async ({ page }, info) => {
  const states: [string, Record<string, unknown>][] = [
    ["midday", { key: "midday:2", triggers: ["home.midday", "home.morning"], context: { n: 6, done: 2, left: 4 }, exclude: ["home.midday#2", "home.morning#1"], actions: [] }],
    ["evening", { key: "evening:3", triggers: ["home.evening"], context: { n: 6, done: 3, left: 3 }, exclude: ["home.evening#1"], actions: [] }],
    ["night", { key: "night", triggers: ["home.night"], context: {}, exclude: [], actions: [] }],
    ["plan-done", { key: "plan_done", triggers: ["home.plan_done"], context: {}, exclude: [], actions: [] }],
    ["welcome-back", { key: "welcome_back", triggers: ["home.welcome_back"], context: {}, exclude: [], actions: [] }],
  ];
  for (const [name, home] of states) {
    await open(page, pexo({ home }));
    await expect(page.getByTestId("home-pexo-bubble")).toBeVisible();
    await shot(page, `home-${name}-${info.project.name}`);
  }
  await open(page, pexo({ home: { key: "care.low_mood", triggers: ["care.low_mood"], context: {}, exclude: [], actions: [] }, care: { active: true, reason: "low_mood", distress: false }, nudge: { trigger: "nudge.lecture_heavy", context: {}, action: null } }));
  await expect(page.getByTestId("home-pexo")).toHaveAttribute("data-care", "on");
  await expect(page.getByTestId("home-pexo-nudge")).toHaveCount(0);
  await shot(page, `home-care-${info.project.name}`);
});

test("first week: the 60-second tour, then the first 15-minute session", async ({ page }, info) => {
  await open(page, pexo({ marks: {}, daysSinceSignup: 0, firstVisits: [] }));
  const tour = page.getByTestId("pexo-tour");
  await expect(tour).toBeVisible();
  await shot(page, `tour-card-${info.project.name}`);
  for (let i = 0; i < 6; i += 1) await page.getByTestId("pexo-tour-next").click();
  await page.getByTestId("pexo-tour-next").click();
  await expect(page.getByTestId("pexo-tour-text")).toContainText("142 days to JEE");
  await shot(page, `tour-finale-${info.project.name}`);
  await page.getByTestId("pexo-tour-next").click();
  await page.getByTestId("pexo-first-start").click();
  await expect(page).toHaveURL(/focus\/start\?.*minutes=15/);
});

test("a first-visit bubble shows once on a new screen", async ({ page }, info) => {
  await open(page, pexo({ firstVisits: [] }), "light", "/syllabus");
  const bubble = page.getByTestId("pexo-transient");
  await expect(bubble).toHaveAttribute("data-line", "first_visit.syllabus#1");
  await shot(page, `first-visit-${info.project.name}`);
});

test("Pexo off: no Pexo anywhere on Home", async ({ page }) => {
  await open(page, { enabled: false, cohort: "pilot_off", libraryVersion: 1, language: "en", bubbles: "normal", notifications: false, accessories: [], shown: {}, firstVisits: [], marks: {}, today, home: null, quests: null, nudge: null, care: { active: false, reason: null, distress: false } });
  await expect(page.getByTestId("home-top")).toBeVisible();
  await expect(page.locator("svg.pexo")).toHaveCount(0);
  await expect(page.getByTestId("prepex-map")).toHaveCount(0);
});
