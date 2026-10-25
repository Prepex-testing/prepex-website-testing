import type { Page, Route } from "@playwright/test";
import type { Band, PlanDay, PlanTask } from "../../lib/api/plannerV2";

/**
 * A signed-in student and a stubbed API, for specs that check how Home and the full plan are laid out. No backend and
 * no account: every call to the three service ports is answered from the fixtures below, and anything else gets an
 * empty success.
 */

const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const at = (h: number, m = 0) => h * 60 + m;

const base: Omit<PlanTask, "id" | "kind" | "title"> = {
  planId: "p", description: null, subjectId: 1, subject: "physics", chapterId: "22222222-2222-4222-8222-222222222222", chapterName: "Kinematics", topic: null, startMin: null, endMin: null,
  estimatedMinutes: 60, plannedUnits: 1, questionCount: null, status: "pending", origin: "goal", contentSource: null, contentSourceLabel: null, generatedBy: "engine", fixedSlot: false, weeklyGoalId: null,
  backlogItemId: null, secondsCompleted: 0, actualMinutes: null, linkedSessionLogId: null, linkedPracticeLogId: null, linkedRevisionLogId: null, linkedMockLogId: null, warning: null,
};

let counter = 0;
const task = (over: Partial<PlanTask> & Pick<PlanTask, "kind" | "title">): PlanTask => ({ ...base, id: `11111111-1111-4111-8111-${String(++counter).padStart(12, "0")}`, ...over });

export const TASKS: PlanTask[] = [
  task({ kind: "lecture", title: "Watch lecture — Kinematics", chapterName: "Kinematics", topic: "Projectile motion", startMin: at(7, 30), endMin: at(9), estimatedMinutes: 90, plannedUnits: 2, status: "in_progress", secondsCompleted: 1800 }),
  task({ kind: "practice", title: "Practice — Mole Concept", subject: "chemistry", subjectId: 2, chapterName: "Mole Concept", topic: "Stoichiometry", startMin: at(14, 30), endMin: at(15, 30), questionCount: 25, contentSource: "dc_pandey", contentSourceLabel: "DC Pandey" }),
  task({ kind: "revision", title: "Revise — Limits", subject: "maths", subjectId: 3, chapterName: "Limits and Continuity", startMin: at(15, 45), endMin: at(16, 15), estimatedMinutes: 30, contentSource: "short_notes", contentSourceLabel: "Short notes", origin: "sr" }),
  task({ kind: "self_study", title: "Study — Cell Cycle", subject: "biology", subjectId: 4, chapterName: "Cell Cycle", topic: "Mitosis stages", startMin: at(16, 15), endMin: at(16, 45), estimatedMinutes: 30, status: "done", actualMinutes: 30 }),
  task({ kind: "backlog", title: "Clear backlog — Optics", chapterName: "Ray Optics", subject: "physics", startMin: at(16, 45), endMin: at(17, 15), estimatedMinutes: 30, origin: "backlog" }),
  task({ kind: "mock", title: "Full mock (JEE Main)", subject: null, subjectId: null, chapterId: null, chapterName: null, startMin: at(17, 30), endMin: at(20, 30), estimatedMinutes: 180, fixedSlot: true }),
];

export const BANDS: Band[] = [
  { chip: "sleep", startMin: 0, endMin: at(6) },
  { chip: "exercise", startMin: at(6), endMin: at(6, 45) },
  { chip: "meal", startMin: at(6, 45), endMin: at(7, 30) },
  { chip: "school", startMin: at(9), endMin: at(14) },
  { chip: "meal", startMin: at(14), endMin: at(14, 30) },
  { chip: "break", startMin: at(15, 30), endMin: at(15, 45) },
  { chip: "exercise", startMin: at(20, 30), endMin: at(21, 15) },
  { chip: "meal", startMin: at(21, 15), endMin: at(21, 45) },
  { chip: "family", startMin: at(21, 45), endMin: at(22, 30) },
  { chip: "sleep", startMin: at(22, 30), endMin: 1440 },
];

export function planDay(over: Partial<PlanDay> = {}): PlanDay {
  const today = new Date();
  return {
    date: iso(today),
    isToday: true,
    mode: "auto",
    plan: { id: "p", version: 1, generatedBy: "engine", engineVersion: 2, budgetMinutes: 420, warnings: [], polishNotes: [], generatedAt: today.toISOString() },
    tasks: TASKS,
    bands: BANDS,
    studyBlocks: [],
    slotSource: "timetable",
    summary: { plannedMinutes: 505, doneMinutes: 30, plannedCount: 6, doneCount: 1, percent: 6 },
    regenerate: { kind: "regenerate", used: 0, limit: 5, remaining: 5, resetsAt: "" },
    suggestions: null,
    ...over,
  };
}

export type StubOptions = { day?: PlanDay };

/** Signs a student in and answers every API call from fixtures. Call before the first `page.goto`. */
export async function stubPlannerApi(page: Page, theme: "light" | "dark", options: StubOptions = {}): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem("prepex_access_token", "stub");
    localStorage.setItem("prepex_refresh_token", "stub");
    localStorage.setItem("prepex_user", JSON.stringify({ id: "u", fullName: "Aarav Sharma", email: "a@example.com" }));
    localStorage.setItem("prepex-theme", t);
  }, theme);

  const today = new Date();
  const days = Array.from({ length: today.getDate() }, (_, i) => ({ date: iso(new Date(today.getFullYear(), today.getMonth(), i + 1)), dayCompletionPercentage: [0, 30, 60, 90, 100][i % 5] }));
  const day = options.day ?? planDay();

  await page.route(/localhost:400[123]\//, (route: Route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith("/api/planner/v2/day")) return route.fulfill(ok(day));
    if (p.endsWith("/api/planner/today/explain")) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, message: "Not found" }) });
    if (p.endsWith("/api/planner/today")) return route.fulfill(ok({ plan: { id: "p", isLateSingUp: false, targetedExam: "JEE Main", dayRemainingForExam: 79, tasks: [], planSource: null, aiSummary: null }, summary: { completionPercentage: 6, totalTimeCompletedSeconds: 1800, totalPlannedMinutes: 505 } }));
    if (p.endsWith("/api/planner/consistency")) return route.fulfill(ok({ year: today.getFullYear(), month: today.getMonth() + 1, days }));
    if (p.endsWith("/status") && p.includes("check")) return route.fulfill(ok({ checkinDate: iso(today), exists: true, checkin: { id: "c", mood: "GOOD", isSkipped: false, isStudyingCrossApp: false, crossAppActivity: null, switchCrossStudyAt: null, burnoutDetected: false, burnoutTier: 0, streakCount: 6, longestStreak: 9, missingDays: 0 }, isInBurnout: false, burnoutStatus: null, isMockToday: false, isBacklogAvailable: false, latestBacklog: null, backlogRecovery: null }));
    if (p.endsWith("/api/focus-sessions/stats")) return route.fulfill(ok({ todayMinutes: 95, weekMinutes: 600, allTimeMinutes: 4000, totalSessions: 40, completedSessions: 30, currentStreak: 6, longestStreak: 9, streak: {} }));
    if (p.endsWith("/api/focus-sessions") || p.endsWith("/api/focus-sessions/current") || p.endsWith("/api/focus-sessions/active")) return route.fulfill(ok(null));
    if (p.endsWith("/api/study-sessions/summary")) return route.fulfill(ok({ period: "day", from: "", to: "", totalMinutes: 95, sessionCount: 2, bySubject: [], byDay: [] }));
    if (p.endsWith("/api/practice/analytics")) return route.fulfill(ok({ period: "week", range: null, totals: { sessions: 4, attempted: 140, correct: 100, wrong: 40, skipped: 0, accuracy: 71, minutes: 200, activeDays: 4 } }));
    if (p.endsWith("/api/revision")) return route.fulfill(ok({ todaysRevisionTasks: { count: 3, tasks: [] }, upcomingRevisions: { count: 0, chapters: [] }, masteredChapters: { count: 0, chapters: [] } }));
    if (p.endsWith("/api/mistakes/stats")) return route.fulfill(ok({ total: 20, active: 15, mastered: 5, masteredPercent: 25, dueNow: 3, dueNext7Days: 4, reviewedToday: 0, reviewStreak: 0, longestReviewStreak: 0, bySubject: [] }));
    if (p.includes("/api/mocks")) return route.fulfill(ok({ items: [{ id: "m1" }], nextCursor: null }));
    if (p.endsWith("/api/goals/current")) return route.fulfill(ok({ weekStart: "", weekEnd: "", isCurrentWeek: true, daysLeft: 3, carryOverCandidates: [], summary: { total: 5, done: 2, percent: 40 }, goals: [{ id: "g", status: "ACTIVE" }] }));
    if (p.endsWith("/api/weakness/top5")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ topics: [{ chapterId: "22222222-2222-4222-8222-222222222222", practiceAccuracy: 41, chapter: { name: "Kinematics", subject: { name: "Physics", code: "PHY" } } }] }) });
    if (p.endsWith("/api/insights/daily")) return route.fulfill(ok({ insight: { id: "i1", date: iso(today), insight: "You studied 95 minutes today, mostly Physics.", nudge: "Spend 20 minutes on Kinematics graph mistakes tomorrow.", feedback: null, createdAt: today.toISOString() }, resting: false }));
    if (p.includes("/api/notifications")) return route.fulfill(ok({ items: [], unreadCount: 0, nextCursor: null }));
    return route.fulfill(ok({}));
  });
}
