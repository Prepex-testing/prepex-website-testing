import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";
import { stubPlannerApi } from "./stubs/plannerStubs";

/**
 * Pexo phase 2: the Climb and forms, in a real browser against a stubbed API (no backend, no account).
 * Set PEXO_SHOTS_DIR to save screenshots.
 */

const SHOTS = process.env.PEXO_SHOTS_DIR;
const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

const pexo = (over: Record<string, unknown> = {}) => ({
  enabled: true,
  cohort: "existing",
  libraryVersion: 2,
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
  form: "solver",
  climb: { steps: 42, todayStudied: false, form: "solver", daysToExam: 71, rocksOpen: 3, gems: 6 },
  ...over,
});

type Step = { date: string; minutes: number; studied: boolean; planDone: boolean; landmarks: unknown[]; checkpoints: unknown[]; smashed: unknown[]; gems: number; milestone: number | null };
type Page1 = { month: string; steps: Step[]; nextCursor: string | null; base: unknown; upcoming: unknown; totals: unknown };
const FRIENDS = [
  { userId: "f1", name: "Asha", username: "asha", avatarUrl: null, form: "topper", steps: 88, studiedToday: true },
  { userId: "f2", name: "Kabir", username: "kabir", avatarUrl: null, form: "grinder", steps: 31, studiedToday: false },
];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const prev = (m: string) => {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
};
const thisMonth = today.slice(0, 7);

/** Days of a month, newest first, up to today: a steady pattern with quiet runs, landmarks, mocks, rubble, gems. */
function monthSteps(month: string, rich: boolean): Step[] {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out: Step[] = [];
  for (let d = last; d >= 1; d -= 1) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    if (date > today) continue;
    const quiet = d % 9 === 0 || d % 9 === 1 || d % 9 === 2;
    const minutes = quiet ? 0 : [35, 80, 150, 260, 95][d % 5]!;
    out.push({
      date,
      minutes,
      studied: minutes > 0,
      planDone: !quiet && d % 4 === 0,
      landmarks: rich && d % 11 === 3 ? [{ chapterId: `c${d}`, name: ["Kinematics", "Mole Concept", "Limits"][d % 3], subject: "Physics", subjectId: (d % 3) + 1 }] : [],
      checkpoints: rich && d % 13 === 5 ? [{ id: `m${d}`, testType: "full_mock", examPattern: "jee_main", score: { total: 120 + d, max: 300 } }] : [],
      smashed: rich && d % 10 === 4 ? [{ id: `s${month}${d}`, chapter: "Work, Energy and Power" }] : [],
      gems: rich && d % 6 === 2 && !quiet ? 2 : 0,
      milestone: null,
    });
  }
  return out;
}
const ROCK_NAMES = ["Laws of Motion", "Thermodynamics", "Integration", "Organic Basics", "Electrostatics", "Optics", "Matrices", "Waves"];
const rocks = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `r${i}`, chapterId: `r${i}`, chapter: ROCK_NAMES[i % 8], subjectId: (i % 3) + 1, hoursLeft: [3, 8, 18][i % 3], size: ["small", "medium", "large"][i % 3], lane: "must", backlogId: `b${i}` }));

function climb(opts: { months: number; rich: boolean; rocks: number; empty?: boolean }) {
  let start = thisMonth;
  for (let i = 1; i < opts.months; i += 1) start = prev(start);
  return {
    page(cursor: string | null): Page1 {
      const month = cursor ?? thisMonth;
      const steps: Step[] = opts.empty ? (month === thisMonth ? [{ date: today, minutes: 0, studied: false, planDone: false, landmarks: [], checkpoints: [], smashed: [], gems: 0, milestone: null }] : []) : monthSteps(month, opts.rich);
      const first = month === thisMonth;
      return {
        month,
        steps,
        nextCursor: month > start ? prev(month) : null,
        base: month === start ? { n: opts.empty ? 0 : 4, chapters: opts.empty ? [] : [{ name: "Units and Dimensions", subject: "Physics", subjectId: 1 }, { name: "Mole Concept", subject: "Chemistry", subjectId: 2 }, { name: "Sets", subject: "Maths", subjectId: 3 }, { name: "Vectors", subject: "Physics", subjectId: 1 }] } : null,
        upcoming: first
          ? { peak: { examDate: "2027-01-22", daysLeft: 71 }, milestones: [{ days: 100, date: "2026-10-14", reached: true }, { days: 50, date: "2026-12-03", reached: false }, { days: 30, date: "2026-12-23", reached: false }, { days: 10, date: "2027-01-12", reached: false }, { days: 1, date: "2027-01-21", reached: false }], rocks: rocks(opts.rocks) }
          : null,
        totals: first ? { start: `${start}-01`, day: opts.months * 30, steps: opts.empty ? 0 : opts.months * 20, chapters: opts.empty ? 0 : 14, mocks: opts.empty ? 0 : 6, rocksSmashed: opts.empty ? 0 : 5, gems: opts.empty ? 0 : 12, form: "solver", daysToExam: 71, todayStudied: false, todayMinutes: 0 } : null,
      };
    },
  };
}
let fixture: { page: (c: string | null) => Page1 } = climb({ months: 3, rich: true, rocks: 3 });
const seen = { tour: today, "climb.intro.seen": today, "climb.milestone.100": today, "form.init": today, "form.seen.aspirant": today, "form.seen.grinder": today, "form.seen.solver": today };

async function open(page: Page, state: Record<string, unknown>, theme: "light" | "dark" = "light", route = "/home") {
  await page.emulateMedia({ colorScheme: theme });
  await stubPlannerApi(page, theme);
  await page.route(/localhost:400[123]\/api\/(xp\/summary|pexo|backlog-items|class-coverage|day-close|sunday-review|profile\/overview|social|rewards|productivity|streak)/, (r: Route) => {
    const u = new URL(r.request().url());
    const p = u.pathname;
    if (p.endsWith("/xp/summary")) return r.fulfill(ok({ level: 3, title: "Aspirant", totalXp: 420, currentThreshold: 300, nextThreshold: 600, progressPct: 40, todayXp: 20, monthXp: 200, todayMinutes: 50, todayStudyMinutes: 95, rankGps: null, pexo: state }));
    if (p.endsWith("/pexo/climb/friends")) return r.fulfill(ok(FRIENDS));
    if (p.endsWith("/pexo/climb")) return r.fulfill(ok(fixture.page(u.searchParams.get("cursor"))));
    if (p.endsWith("/pexo/social")) return r.fulfill(ok(null));
    if (p.endsWith("/pexo/ask")) return r.fulfill(ok({ trigger: "ask.next.task", context: { task: "Practice: Mole Concept" }, action: { kind: "focus", label: "Start", taskId: "t1", subjectId: 2, taskType: "practice", minutes: 60 } }));
    if (p.includes("/backlog-items")) return r.fulfill(ok({ totals: { open: 3, scheduled: 1, overdue: 0, total: 4 }, items: [], bySubject: [] }));
    if (p.includes("/class-coverage")) return r.fulfill(ok([]));
    if (p.endsWith("/day-close")) return r.fulfill(ok({ date: today, status: "not_yet", triggerMinute: 1290, triggerReason: "fallback", summary: { minutes: 95, tasksDone: 1, tasksTotal: 6, questions: 0, revisions: 0 }, unfinished: [], coverage: [] }));
    if (p.endsWith("/sunday-review")) return r.fulfill(ok({ status: "not_yet" }));
    if (p.includes("/social/studying-now")) return r.fulfill(ok([]));
    if (p.includes("/social")) return r.fulfill(ok({ rows: [], me: { rank: null } }));
    if (p.endsWith("/rewards")) return r.fulfill(ok({ lifetime: { questions: 0, hours: 0, chaptersCompleted: 0 }, badges: [], unseen: [], records: [], brokenRecords: [] }));
    if (p.includes("/streak")) return r.fulfill(ok({ currentStreak: 4, longestStreak: 9 }));
    if (p.includes("/productivity")) return r.fulfill(ok({ rows: [], me: { rank: null } }));
    if (p.endsWith("/profile/overview")) return r.fulfill(ok({ daysUntilExam: 71, exam: { name: "JEE Main" } }));
    return r.fulfill(ok(null));
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
  test(`the Climb: an active student (${theme})`, async ({ page }, info) => {
    fixture = climb({ months: 3, rich: true, rocks: 3 });
    const errors = await open(page, pexo({ marks: seen, firstVisits: ["climb"] }), theme, "/home/climb");
    await expect(page.getByTestId("climb-peak")).toBeVisible();
    await expect(page.getByTestId("climb-today-bubble")).toBeVisible();
    await expect(page.getByTestId("climb-landmark").first()).toBeVisible();
    await shot(page, `climb-active-${theme}-${info.project.name}`);
    await page.getByTestId("climb-landmark").first().click();
    await expect(page.getByTestId("climb-detail-line")).toContainText("is now a landmark on your climb");
    await shot(page, `climb-landmark-${theme}-${info.project.name}`);
    await page.keyboard.press("Escape");
    await page.getByTestId("climb-friends-toggle").click();
    await expect(page.getByTestId("climb-friend")).toHaveCount(2);
    await page.getByTestId("climb-friends").scrollIntoViewIfNeeded();
    await shot(page, `climb-friends-${theme}-${info.project.name}`);
    await page.getByTestId("climb-view-toggle").click();
    await expect(page.getByTestId("climb-list")).toBeVisible();
    await shot(page, `climb-list-${theme}-${info.project.name}`);
    await page.getByTestId("climb-view-toggle").click();
    await page.getByTestId("climb-share-open").click();
    await expect(page.getByTestId("climb-share-preview")).toBeVisible({ timeout: 20_000 });
    await shot(page, `climb-share-${theme}-${info.project.name}`);
    expect(errors).toEqual([]);
  });
}

test("the Climb: a brand-new student, first visit", async ({ page }, info) => {
  fixture = climb({ months: 1, rich: false, rocks: 0, empty: true });
  const errors = await open(page, pexo({ marks: { tour: today }, firstVisits: [], form: "aspirant", climb: { steps: 0, todayStudied: false, form: "aspirant", daysToExam: 71, rocksOpen: 0, gems: 0 } }), "light", "/home/climb");
  await expect(page.getByTestId("pexo-transient")).toHaveAttribute("data-line", "first_visit.climb#1");
  await shot(page, `climb-new-first-visit-${info.project.name}`);
  await page.getByTestId("pexo-transient").getByRole("button", { name: /dismiss/i }).click();
  await expect(page.getByTestId("climb-today-bubble")).toContainText(/Your climb starts|This is your climb/);
  await expect(page.getByTestId("climb-base")).toContainText("Your climb starts here.");
  await shot(page, `climb-new-${info.project.name}`);
  expect(errors).toEqual([]);
});

test("the Climb: a heavy backlog, and a rock smashed today", async ({ page }, info) => {
  const base = climb({ months: 2, rich: true, rocks: 8 });
  fixture = {
    page: (c) => {
      const p = base.page(c);
      if (!c) p.steps[0] = { ...p.steps[0]!, smashed: [{ id: "smash-now", chapter: "Optics" }] };
      return p;
    },
  };
  const errors = await open(page, pexo({ marks: seen, firstVisits: ["climb"] }), "light", "/home/climb");
  await expect(page.getByTestId("climb-rock")).toHaveCount(8);
  await shot(page, `climb-heavy-backlog-${info.project.name}`);
  // the smash is said once, with Pexo's line
  await expect(page.getByTestId("pexo-transient")).toHaveAttribute("data-line", "climb.rock.smashed#1");
  await shot(page, `climb-rock-smash-${info.project.name}`);
  expect(errors).toEqual([]);
});

test("two years of days: months load as you scroll, without long frames", async ({ page }) => {
  fixture = climb({ months: 24, rich: true, rocks: 2 });
  // PERF_STRICT: a mid-range Android, roughly (4x slower CPU)
  if (process.env.PERF_STRICT) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const t0 = Date.now();
  await open(page, pexo({ marks: seen, firstVisits: ["climb"] }), "light", "/home/climb");
  await expect(page.getByTestId("climb-today")).toBeVisible();
  const firstRender = Date.now() - t0;
  await page.evaluate(() => {
    const w = window as unknown as { __long: number };
    w.__long = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (e.duration > 100) w.__long += 1;
    }).observe({ type: "longtask", buffered: false });
  });
  for (let i = 0; i < 30; i += 1) {
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(120);
  }
  const months = await page.getByTestId("climb-month").count();
  const long = await page.evaluate(() => (window as unknown as { __long: number }).__long);
  test.info().annotations.push({ type: "scroll", description: `${months} months loaded, ${long} long tasks over 100 ms` });
  expect(months).toBeGreaterThan(3);
  // frame budgets are only meaningful on a production build (PERF_STRICT=1 with `next start`); dev React is slower
  if (process.env.PERF_STRICT) expect(long).toBeLessThan(5);
  console.info(`climb scroll: ${months} months, ${long} long tasks; first render ${firstRender} ms`);
});

test("from Home to the Climb: first render under a second once the app is open", async ({ page }) => {
  fixture = climb({ months: 6, rich: true, rocks: 3 });
  await open(page, pexo({ marks: seen, firstVisits: ["climb"] }), "light", "/home");
  await expect(page.getByTestId("home-climb-strip")).toBeVisible();
  // the Climb's first month is already in the request cache from an earlier visit
  await page.getByTestId("home-climb-strip").click();
  await expect(page.getByTestId("climb-today")).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId("home-climb-strip")).toBeVisible();
  const t0 = Date.now();
  await page.getByTestId("home-climb-strip").click();
  await expect(page.getByTestId("climb-today")).toBeVisible();
  const ms = Date.now() - t0;
  console.info(`home -> climb (cached): ${ms} ms`);
  if (process.env.PERF_STRICT) expect(ms).toBeLessThan(1000);
});

test("a form reveal on the next open (backfill), and Home's climb strip", async ({ page }, info) => {
  fixture = climb({ months: 2, rich: true, rocks: 1 });
  const errors = await open(page, pexo({ marks: { tour: today }, form: "ranker" }), "dark", "/home");
  await expect(page.getByTestId("form-reveal")).toHaveAttribute("data-form", "ranker");
  await shot(page, `form-reveal-${info.project.name}`);
  await page.getByTestId("form-reveal-close").click();
  await expect(page.getByTestId("home-climb-strip")).toContainText("42 steps climbed");
  await page.getByTestId("home-climb-strip").scrollIntoViewIfNeeded();
  await shot(page, `home-climb-strip-${info.project.name}`);
  expect(errors).toEqual([]);
});

test("Climb off: no strip on Home, and the screen says so", async ({ page }) => {
  fixture = climb({ months: 1, rich: false, rocks: 0 });
  await open(page, pexo({ climb: null, marks: seen }), "light", "/home");
  await expect(page.getByTestId("home-top")).toBeVisible();
  await expect(page.getByTestId("home-climb-strip")).toHaveCount(0);
  await page.goto("/home/climb");
  await expect(page.getByTestId("climb-off")).toBeVisible();
});
